<p align="center">
  <img src="public/icons/fox-192.png" width="96" alt="Wortfuchs" />
</p>


<h1 align="center">Wortfuchs</h1>

<p align="center">
  Vokabeltrainer-PWA für Kinder am Gymnasium — offline-first, mit 6-Phasen-Lernsystem.<br />
  <strong>Live: <a href="https://denktital.github.io/wortfuchs/">denktital.github.io/wortfuchs</a></strong>
</p>

## Funktionen

- **6-Phasen-Lernsystem** (Spaced Repetition nach phase6-Methodik): richtig beantwortete Karten wandern in größer werdenden Abständen nach oben, falsche zurück in Phase 1
- **3 Abfragearten**: Multiple Choice, Tippen (mit Tippfehler-Toleranz) und Selbstbewertung — Richtung DE→EN, EN→DE oder gemischt
- **Offline-first PWA**: läuft installiert auf dem iPhone-Homescreen, Lernen funktioniert ohne Internet, Sync sobald wieder online
- **Personalisierung pro Kind**: App-Name, Maskottchen (Fuchs, Eule, Panda, Drache) und Farb-Theme frei wählbar — inklusive Homescreen-Icon
- **Gamification**: XP, Level, Tages-Streak, Wochen-Rangliste, Sammelkarten (Langzeit-Vokabeln in Gold), Level-up-Konfetti
- **Testvorbereitung**: Lektionen gezielt üben, ohne das Phasensystem zu beeinflussen
- **Unregelmäßige Verben**: eigenes Trainingsmodul mit Streak pro Verb
- **Audio**: englische Wörter und Beispielsätze per Text-to-Speech (Stimme und Tempo einstellbar, britisches Englisch bevorzugt)
- **Eltern-Ansicht**: Wochenübersicht pro Kind — Lernzeit, Erfolgsquote, Phasenverteilung, schwierige Vokabeln
- **Karten-Editor**: eigene Vokabeln anlegen, Notizen ergänzen, Karten aus der Abfrage nehmen

## Stack

React + TypeScript + Vite · Dexie.js (IndexedDB) · Supabase (Postgres, Auth, RLS) · `vite-plugin-pwa` — statisch deploybar, kein eigener Server. Deployment automatisch per GitHub Actions auf GitHub Pages.

## Entwicklung

```bash
npm install
npm run dev:demo   # lokaler Demo-Modus ohne Backend (Beispielkarten)
npm run dev        # gegen Supabase (braucht .env, siehe SETUP.md)
npm run build      # Produktions-Build inkl. TypeScript-Check
```

Die komplette Einrichtung (Supabase-Projekt, Migrationen, Accounts, Vokabel-Import, Deployment) steht in [SETUP.md](SETUP.md). Das Design-System ist in [DESIGN.md](DESIGN.md) definiert.

## Inhalte & Datenschutz

Dieses Repository enthält **keine Vokabelinhalte** — Lerninhalte liegen ausschließlich in einer privaten Supabase-Datenbank hinter Login (Row Level Security). Für Entwicklung und Demo werden generische Beispielkarten verwendet. Ein privates Familienprojekt, nicht für den produktiven Fremdeinsatz gedacht.
