# Wortfuchs — Einrichtung

Die App läuft ohne Backend im **lokalen Demo-Modus** (12 Beispielkarten). Für den
echten Betrieb mit Green-Line-Vokabeln, Accounts und Geräte-Sync brauchst du ein
kostenloses Supabase-Projekt. Einmalige Einrichtung, ca. 15 Minuten.

## 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) registrieren → „New project" (Region: EU/Frankfurt)
2. **SQL Editor** öffnen → die Dateien aus `supabase/migrations/` in Reihenfolge
   ausführen (je einmal einfügen → Run): `0001_init.sql`,
   `0002_family_reads_sessions.sql`, `0003_verb_progress.sql`

## 2. Accounts anlegen

Dashboard → **Authentication → Users → Add user** (E-Mail + Passwort). Pro Nutzer
unter „User Metadata" eintragen:

```json
{ "role": "child", "display_name": "Name des Kindes" }
```

Für dich als Elternteil `"role": "parent"`. (Self-Signup in der App ist bewusst
nicht eingebaut — Accounts legt nur der Admin an. Optional im Dashboard unter
Authentication → Sign In / Up → „Allow new users to sign up" deaktivieren.)

## 3. Vokabeln importieren

```bash
cp .env.example .env      # und Werte aus Project Settings → API eintragen
npm install
npm run import            # liest Vokabeln_GreenLine_2021_gesamt.xlsx → Supabase
```

Erwartung: „3518 Vokabeln gelesen", am Ende **3516 Karten** in der Datenbank
(2 echte Duplikate in der Excel werden zusammengeführt). Der Import ist
idempotent — bei neuen Inhalten einfach erneut laufen lassen.

⚠️ Die Vokabeln sind urheberrechtlich geschützt: Sie leben **nur** in Supabase
hinter Login. `.xlsx`/`.pdf` und `.env` sind gitignored — niemals committen.

## 4. Lokal starten

```bash
npm run dev
```

Mit gesetzten `VITE_…`-Variablen erscheint der Login; ohne läuft der Demo-Modus.

## 5. Deployment: GitHub Pages (kostenlos)

Der Workflow `.github/workflows/deploy.yml` deployt bei jedem Push auf `main`
automatisch. Der Unterpfad (`/<repo>/`) wird dabei automatisch gesetzt.
Voraussetzung: **öffentliches** Repo (GitHub-Free) — die Vokabeln sind davon
nicht betroffen, sie liegen nur in Supabase hinter Login.

1. Öffentliches GitHub-Repo anlegen und pushen
2. Repo → Settings → **Secrets and variables → Actions** → zwei Secrets anlegen:
   `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (Werte wie in `.env`)
3. Repo → Settings → **Pages** → Source: **GitHub Actions**
4. Push auf `main` (oder Actions → „Deploy zu GitHub Pages" → Run workflow)

Die App ist dann unter `https://<user>.github.io/<repo>/` erreichbar.

**Alternative Cloudflare Pages** (falls das Repo privat bleiben soll):
Projekt verbinden, Build `npm run build`, Output `dist`, gleiche Env-Variablen —
`BASE_PATH` dort **nicht** setzen.

## 6. Aufs iPhone bringen

1. Deployte URL in **Safari** öffnen und anmelden
2. Unter Profil ggf. zuerst Name/Maskottchen/Farbe wählen (bestimmt Homescreen-Icon und -Namen)
3. Teilen-Symbol → **„Zum Home-Bildschirm"**

Danach startet die App im Vollbild, funktioniert offline und synchronisiert,
sobald wieder Internet da ist.
