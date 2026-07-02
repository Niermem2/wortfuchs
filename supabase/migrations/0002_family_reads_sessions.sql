-- Wochen-Rangliste: Kinder sehen die Wochen-XP der Geschwister.
-- Sessions enthalten nur Lernstatistik (Dauer, Kartenzahl, XP) — unkritisch
-- innerhalb der Familie. Im Supabase SQL-Editor ausführen.

drop policy "own or parent reads sessions" on sessions;
create policy "family reads sessions" on sessions for select to authenticated using (true);
