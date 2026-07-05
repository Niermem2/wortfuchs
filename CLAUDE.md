# Wortfuchs — Vokabeltrainer

PWA-Vokabeltrainer (phase6-Umfang) für Kinder am Gymnasium, Englisch Green Line 2021.
Läuft im Browser und als installierte PWA auf dem iPhone. Offline-first.

## Stack

- React + TypeScript + Vite, PWA via `vite-plugin-pwa`
- Lokale Daten: IndexedDB via Dexie.js — die App arbeitet immer gegen Dexie
- Backend: Supabase (Postgres + Auth + RLS), Sync-Layer gleicht ab wenn online
- Kein eigener Server, statisch deploybar

## Befehle

- `npm run dev` — Dev-Server
- `npm run build` — Produktions-Build (inkl. TypeScript-Check)
- `npm run import` — Excel-Import nach Supabase (braucht `.env` mit Service-Key, siehe SETUP.md)
- `node scripts/gen-icons.mjs` — PWA-Icons für alle Maskottchen neu erzeugen (aus `src/assets/mascots/*.svg`)

## Architektur-Regeln

- **Offline-first:** UI liest/schreibt nur Dexie (`src/data/db.ts`). Supabase wird ausschließlich vom Sync-Layer (`src/data/sync.ts`) angesprochen.
- **Lernalgorithmus:** 6-Phasen-System (phase6-Methodik) in `src/learn/srs.ts`. Neu → Phase 1 (heute) → 2 (1 Tag) → 3 (3 Tage) → 4 (9 Tage) → 5 (30 Tage) → 6 (90 Tage) → gelernt. Falsche Antwort → zurück in Phase 1.
- **Lokaler Modus:** Ohne Supabase-Env-Vars läuft die App komplett lokal (Dev + Fallback). Kein Code darf eine Supabase-Verbindung voraussetzen.

## Design

- **Design strikt nach `DESIGN.md`** (Wortfuchs-Design-System). Jeder neue Screen und jede Komponente folgt den dortigen Tokens, Komponenten- und Motion-Regeln.
- Alle Farben nur über CSS-Custom-Properties (`--grape`, `--fox`, `--mint` …) — nie Hex-Werte in Komponenten.
- App-Name, Maskottchen und Farb-Theme sind **pro Profil konfigurierbar** (Presets in `src/theme/`). „Wortfuchs" ist nur der Default — den Namen nirgends hart codieren, immer aus den Settings lesen.
- Dark Mode ist Pflicht, `prefers-reduced-motion` respektieren.

## Datenschutz / Urheberrecht

- **Vokabelinhalte (Green Line) dürfen niemals ins Git-Repo** — nicht als Seed, nicht als Fixture, nicht in Tests. Sie leben ausschließlich in Supabase hinter Login (RLS).
- `*.xlsx` und `*.pdf` im Projektordner sind Quellmaterial und bleiben gitignored.
- Für Dev/Demos nur die generischen Beispielkarten aus `src/data/demo-cards.ts` verwenden.

## Sprache

UI-Texte auf Deutsch, Du-Ansprache, Tonalität nach DESIGN.md (kurz, aktiv, nicht babyhaft).
