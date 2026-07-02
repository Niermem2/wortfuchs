# DESIGN.md — Wortfuchs

Vokabeltrainer für Jugendliche von 11–16 Jahren.

> **Design-Prinzip:** *Clean base, playful energy.* Eine ruhige, erwachsene
> Grundstruktur (klare Typografie, viel Weißraum, moderne Violett-Basis) trägt
> eine verspielte Belohnungsebene (Streaks, XP, Fuchs-Motiv, Micro-Animationen).
> So wirkt die App für 16-Jährige nicht kindisch und motiviert trotzdem 11-Jährige.
> Wenn du unsicher bist: **Struktur bleibt ruhig, die Energie steckt in Feedback und Belohnung.**

---

## 1. Brand

- **Name:** Wortfuchs
- **Maskottchen / Signature:** ein cleverer Fuchs. Das warme Fuchs-Orange (`--fox`)
  ist gleichzeitig die Farbe für Streaks und Energie — Maskottchen und
  Belohnungssystem teilen sich bewusst eine Farbe.
- **Persönlichkeit:** freundlich, klug, motivierend, direkt. Nie belehrend,
  nie babyhaft.
- **Tonalität in Texten:** kurze, aktive Sätze, Du-Ansprache, Kleinschreibung in
  UI-Labels vermeiden (deutsche Substantive groß), keine Ausrufezeichen-Flut.
  „Weiter" statt „Klicke hier zum Fortfahren".

---

## 2. Color

Farben tragen Bedeutung, nie Dekoration. Grün = richtig, Rot = falsch,
Orange = Energie/Streak, Gold = XP, Violett = Marke/Aktion.

### Light Mode

| Token | Hex | Verwendung |
|---|---|---|
| `--paper` | `#F4F1FA` | Seitenhintergrund (weiches Lila-Weiß) |
| `--card` | `#FFFFFF` | Karten, Flächen |
| `--ink` | `#201A2E` | Primärtext (tiefes Aubergine-Schwarz) |
| `--ink-soft` | `#6E6880` | Sekundärtext, Labels |
| `--line` | `#E9E4F2` | Rahmen, Trenner (1.5px) |
| `--grape` | `#6B47E8` | **Primärfarbe** — Marke, Buttons, aktive Zustände |
| `--grape-deep` | `#4E2FC0` | 3D-Button-Schatten, Pressed-State |
| `--grape-soft` | `#ECE6FD` | Tints, aktive Hintergründe |
| `--mint` | `#17C471` | Erfolg, richtige Antwort |
| `--mint-soft` | `#DBF7E9` | Erfolgs-Hintergrund |
| `--berry` | `#F1476B` | Fehler, falsche Antwort |
| `--berry-soft` | `#FDE3E9` | Fehler-Hintergrund |
| `--fox` | `#FF8A3D` | **Energie/Streak** + Maskottchen |
| `--fox-soft` | `#FFE9D8` | Streak-Hintergrund |
| `--gold` | `#FFC531` | XP, Sterne, Belohnung |

### Dark Mode

Dark Mode ist Pflicht (Teenager nutzen ihn stark).

| Token | Hex |
|---|---|
| `--paper` | `#16131F` |
| `--card` | `#211C2E` |
| `--ink` | `#F3F0FA` |
| `--ink-soft` | `#A29CB5` |
| `--line` | `#322B44` |
| `--grape` | `#9B7BF5` |
| `--grape-deep` | `#6B47E8` |
| `--grape-soft` | `#2A2140` |

Semantische Farben (`--mint`, `--berry`, `--fox`, `--gold`) bleiben nahezu gleich,
ihre `-soft`-Tints werden abgedunkelt (~15 % Deckkraft der Vollfarbe).

### Regeln

- **Nie reine Primärfarben-Paletten** (kein Rot/Blau/Gelb-Kindergarten-Look).
- **Text auf farbigen Flächen:** immer die dunkelste Stufe derselben Farbfamilie,
  nie reines Schwarz.
- **Farbe nie allein als Signal** — richtig/falsch immer zusätzlich mit Icon
  (Häkchen / X) und Text.
- Kontrast mindestens 4.5:1 für Text.

---

## 3. Typography

Bewusstes Paar: eine **chunky, runde Display-Schrift mit Zurückhaltung** plus eine
**klare geometrische UI-Schrift**.

- **Display** (`--font-display`): **Baloo 2** — nur für das große Vokabelwort,
  das Logo und große Level-/XP-Zahlen. Sparsam einsetzen; das ist das
  Persönlichkeits-Element.
- **UI / Body** (`--font-ui`): **Plus Jakarta Sans** — alles andere: Buttons,
  Antworten, Navigation, Fließtext.
- Fallback: `system-ui, -apple-system, sans-serif`.
- Beide via Google Fonts.

### Type-Scale

| Rolle | Größe / Zeilenh. | Schrift / Weight |
|---|---|---|
| Hero-Wort | 40 / 44 | Baloo 2 · 700 |
| H1 | 26 / 32 | Jakarta · 700 |
| H2 | 20 / 26 | Jakarta · 700 |
| H3 | 17 / 24 | Jakarta · 600 |
| Body | 15 / 22 | Jakarta · 500 |
| Button | 16 / 20 | Jakarta · 700 |
| Label / Caption | 12 / 16 | Jakarta · 600, Versalien, Tracking 0.6px |

---

## 4. Spacing & Layout

- **Basis-Einheit:** 4px. Skala: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`.
- **Screen-Padding:** 20px.
- **Card-Padding:** 20px (Hero-Karten 24px).
- **Abstand zwischen Karten:** 12–16px.
- **Mobile-first**, eine primäre Aktion pro Screen, große Tap-Ziele
  (min. 44×44px), wenig Text pro Bildschirm.

---

## 5. Radius & Elevation

| Token | Wert | Verwendung |
|---|---|---|
| `--r-chip` | 10px | Chips, Tags |
| `--r-card` | 20px | Karten, Inputs, Antwort-Optionen |
| `--r-hero` | 26px | Vokabelkarte, große Flächen |
| `--r-tile` | 14px | Icon-Kacheln, Avatar-Container |
| `--r-pill` | 999px | Buttons, Streak-Pill, Progress-Bar |

**Schatten**

- Karte: `0 4px 16px rgba(107,71,232,0.08)`
- Schwebend (Modal, FAB): `0 12px 32px rgba(107,71,232,0.16)`
- **3D-Button (Signature-Interaktion):** unter dem Button liegt ein harter
  Schatten `0 4px 0 var(--grape-deep)`. Beim Drücken `translateY(3px)` +
  Schatten auf `0 1px 0` — der „drückbare" Duolingo-Effekt.

---

## 6. Components

### Buttons
- **Primär:** Pill, `--grape`-Fläche, weißer Text 16/700, Höhe 52px,
  3D-Bottom-Schatten, Press = `translateY`.
- **Sekundär:** `--card`-Fläche, 1.5px `--line`-Rahmen, Text `--ink`.
- **Ghost/Icon:** transparent, nur Icon, Hover = `--grape-soft`.

### Vokabelkarte (Hero)
Große weiße Karte, `--r-hero`, Padding 24px, das abgefragte Wort zentral und groß
in Baloo 2. Optional Wortart-Chip und Aussprache darüber.

### Antwort-Option
Volle Breite, `--r-card`, 1.5px Rahmen. Zustände:
- **default:** `--line`-Rahmen, `--card`-Fläche
- **selected:** `--grape`-Rahmen, `--grape-soft`-Fläche
- **correct:** `--mint`-Rahmen, `--mint-soft`-Fläche, Häkchen-Icon
- **wrong:** `--berry`-Rahmen, `--berry-soft`-Fläche, X-Icon

### Progress-Bar
Pill, Höhe 12px, `--grape`-Füllung auf `--grape-soft`-Track, animiertes Wachsen.

### Streak-Pill
Pill mit Flammen-Icon, `--fox`-Fläche, Zahl in `--fox`-900-Ton.

### XP-Badge
Gold-Stern + Zahl, `--gold`.

### Level-Ring
Kreisförmige Progress-Anzeige um den Avatar (Fuchs).

### Bottom-Nav
4 Icons (Lernen · Karten · Rangliste · Profil), aktives Icon `--grape`,
inaktiv `--ink-soft`.

### Wort-Sammelkarte
Vokabeln als sammelbare Kärtchen (leichte Trading-Card-Anmutung) — motiviert
über Sammel-Fortschritt, ohne kindisch zu werden.

---

## 7. States & Motion

- **Richtig:** grünes Aufleuchten + kurzer Scale-Bounce (1 → 1.04 → 1) + Häkchen.
- **Falsch:** kurzes horizontales Shake (±6px, 300ms) + rotes Aufleuchten.
- **Button-Press:** `translateY(3px)`, Schatten kollabiert.
- **Übergänge:** 150–200ms `ease-out`.
- **Level-up / Streak-Meilenstein:** Konfetti- bzw. Stern-Burst, Fuchs-Reaktion.
- `prefers-reduced-motion` respektieren: Bounce/Shake/Konfetti dann weglassen,
  nur Farbwechsel zeigen.

---

## 8. Iconography

- Runde, klare Icons, 2px-Stroke, konsistentes Set (z. B. Lucide „rounded" oder
  Tabler outline). Keine gemischten Stile.
- Größen: 20px inline, 24px in der Navigation.

---

## 9. Accessibility

- Kontrast ≥ 4.5:1 für Text.
- Tap-Ziele ≥ 44×44px.
- Richtig/Falsch nie nur über Farbe — immer Icon + Text.
- Dynamische Schriftgröße unterstützen.
- Sichtbarer Tastatur-Fokus, `prefers-reduced-motion` beachten.

---

*Diese DESIGN.md an einen Coding-Agent (Claude Code, Cursor, Stitch …) übergeben
und sagen: „Halte dich beim Bauen an DESIGN.md." Jeder neue Screen folgt dann
automatisch dieser visuellen Sprache.*
