# WM-kicktipp

Kleine React/Vite-App fuer eine WM-2026-Kicktipp-Runde.

## Setup

1. Supabase-Projekt anlegen.
2. SQL aus `supabase/schema.sql` im Supabase SQL Editor ausfuehren.
3. In Vercel diese Environment Variables setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret/service-role key, nicht der `sb_publishable_...` Key)
4. Lokal starten:

```bash
npm install
npm run dev
```

## Spieltags-Logik

Kicktipp teilt die Gruppenphase in 10 Spieltage. Die App aggregiert diese zu den drei echten WM-Gruppenspieltagen:

- WM Spieltag 1: Kicktipp 1-3
- WM Spieltag 2: Kicktipp 4-6
- WM Spieltag 3: Kicktipp 7-10
- K.o.-Runden: Achtelfinale, Viertelfinale, Halbfinale und Finale werden separat eingetragen

Im Admin-Bereich werden die Punkte pro Kicktipp-Spieltag und K.o.-Runde eingegeben. Die Tabelle berechnet daraus automatisch Gesamtpunkte, WM-Spieltage und K.o.-Summen.

## Cash-out

Die App berechnet den aktuellen Cash-out aus Gesamtpunkten und Spieltagssiegen:

- WM Spieltag 1: 17,50 EUR
- WM Spieltag 2: 17,50 EUR
- WM Spieltag 3: 17,50 EUR
- Platz 1: 42,50 EUR
- Platz 2: 27,50 EUR
- Platz 3: 12,50 EUR

Bei Punktgleichstand wird der jeweilige Preis geteilt.
