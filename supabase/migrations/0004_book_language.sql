-- Lernfächer: jedes Buch gehört zu einer Sprache (Englisch, Latein, Spanisch).
-- Bestehende Bücher (Green Line / Camden Town) sind Englisch.
alter table books
  add column language text not null default 'en'
  check (language in ('en', 'la', 'es'));
