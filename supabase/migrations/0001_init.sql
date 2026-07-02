-- Wortfuchs: Schema + RLS
-- Ausführen im Supabase SQL-Editor (oder via supabase db push).
-- Modell: ein Supabase-Projekt = eine Familie. Alle angemeldeten Nutzer sind
-- Familienmitglieder; Inhalte (cards) sind nur hinter Login lesbar (Urheberrecht).

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'child' check (role in ('child', 'parent')),
  display_name text not null default '',
  xp integer not null default 0,
  level integer not null default 1,
  streak_days integer not null default 0,
  last_learned_at date,
  updated_at timestamptz not null default now()
);

create table books (
  id integer primary key,
  name text not null,
  sort_order integer not null default 0
);

create table lessons (
  id bigint generated always as identity primary key,
  book_id integer not null references books on delete cascade,
  code text not null,
  name text not null default '',
  sort_order integer not null default 0,
  unique (book_id, code)
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  lesson_id bigint not null references lessons on delete cascade,
  english text not null,
  phonetic text,
  german text not null,
  example_en text,
  example_de text,
  note text,
  is_custom boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (lesson_id, english, german)
);

create table card_progress (
  user_id uuid not null references profiles on delete cascade,
  card_id uuid not null references cards on delete cascade,
  phase integer not null default 0 check (phase between 0 and 6),
  due_date date,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  started_at timestamptz not null,
  duration_sec integer not null default 0,
  cards_seen integer not null default 0,
  cards_correct integer not null default 0,
  xp_earned integer not null default 0,
  mode text not null default 'learn'
);

create table settings (
  user_id uuid primary key references profiles on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Profil automatisch beim Registrieren anlegen (Rolle aus Signup-Metadaten)
create function handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'child'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create function is_parent()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'parent'
  );
$$;

alter table profiles enable row level security;
alter table books enable row level security;
alter table lessons enable row level security;
alter table cards enable row level security;
alter table card_progress enable row level security;
alter table sessions enable row level security;
alter table settings enable row level security;

-- Profile: Familie sieht sich gegenseitig (Rangliste), jeder pflegt nur sich selbst
create policy "family reads profiles" on profiles for select to authenticated using (true);
create policy "own profile update" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Inhalte: nur hinter Login lesbar; Bearbeitung in der App erlaubt (Editor)
create policy "family reads books" on books for select to authenticated using (true);
create policy "family reads lessons" on lessons for select to authenticated using (true);
create policy "family reads cards" on cards for select to authenticated using (true);
create policy "family writes cards" on cards for insert to authenticated with check (true);
create policy "family updates cards" on cards for update to authenticated using (true);
create policy "family deletes custom cards" on cards for delete to authenticated using (is_custom);

-- Lernfortschritt: eigener Schreibzugriff, Eltern lesen mit
create policy "own or parent reads progress" on card_progress for select to authenticated
  using (user_id = auth.uid() or is_parent());
create policy "own progress insert" on card_progress for insert to authenticated
  with check (user_id = auth.uid());
create policy "own progress update" on card_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own or parent reads sessions" on sessions for select to authenticated
  using (user_id = auth.uid() or is_parent());
create policy "own sessions insert" on sessions for insert to authenticated
  with check (user_id = auth.uid());

-- Einstellungen: strikt privat
create policy "own settings" on settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
