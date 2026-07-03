-- Trainingsmodul unregelmäßige Verben: Fortschritt pro Verb.
-- Im Supabase SQL-Editor ausführen (nach 0002).

create table verb_progress (
  user_id uuid not null references profiles on delete cascade,
  verb text not null,
  streak integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, verb)
);

alter table verb_progress enable row level security;

create policy "own or parent reads verb progress" on verb_progress for select to authenticated
  using (user_id = auth.uid() or is_parent());
create policy "own verb progress insert" on verb_progress for insert to authenticated
  with check (user_id = auth.uid());
create policy "own verb progress update" on verb_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
