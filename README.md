# We Are Foilers

Weltweite Community-Karte für Foiler. Statische Seite (HTML/CSS/JS, kein Build-Schritt), Bauweise wie foilbattery.

## Lokal ansehen

```bash
python3 tools/serve.py
```

Dann http://127.0.0.1:8080 öffnen. Admin-Seite: http://127.0.0.1:8080/admin.html

Ohne Supabase-Keys in `assets/js/config.js` läuft alles im **Demo-Modus**: erfundene Beispiel-Profile, Login nur simuliert, die eigene Karte, Meldungen und Admin-Entscheidungen liegen im Browser (localStorage). Auf der Admin-Seite gibt es „Reset demo data“.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Karte, Liste, Profilkarte, Dialoge (Anmelden, Karte bearbeiten, Reise-Modus, Melden, About/FAQ) |
| `admin.html` | Freigabe, Meldungen, alle Karten, Schalter „Manual approval“ |
| `assets/css/app.css` | Design „Morning Glass“, Farben in `:root` |
| `assets/js/config.js` | Einstellungen, Feature-Schalter, Karte |
| `assets/js/catalog.js` | Disziplinen, Level, „Open for“-Tags, Marken, Sprüche |
| `assets/js/ui.js` | Avatar, Profilkarte, Listenzeile (für Karte und Admin) |
| `assets/js/store-demo.js` | Demo-Daten und Demo-Speicher (gleiche Schnittstelle wie später `store-supabase.js`) |
| `assets/js/app.js` / `admin.js` | Logik |
| `assets/vendor/` | Leaflet, MarkerCluster, MapLibre + Leaflet-Brücke, supabase-js (lokal, keine CDNs) |
| `assets/fonts/` | Manrope (SIL OFL) |
| `design/directions.html` | Die drei Design-Entwürfe (B wurde gewählt) |

## Karte

OpenFreeMap (kostenlos, ohne Key, ohne Limit, OSM-Daten), als Vektorkarte über MapLibre und in `app.js` auf die Design-Farben umgefärbt. CARTO verlangt inzwischen einen API-Key, die OSM-Standardkacheln blockieren Entwicklungs-Zugriffe.

## Backend (Supabase)

Projekt `lbehkomudrhnwmkfiysz`, Region eu-west-1 (Irland). URL und Publishable Key stehen in `assets/js/config.js` (dürfen ins Repo). **Passwörter und Secrets nie ins Repo.**

- `supabase/schema.sql`: Tabellen, Zeilen- und Spaltenrechte, alle Schreib-Funktionen, Foto-Speicher. Idempotent, im SQL Editor ausführen.
- `supabase/auto-entries.sql`: automatisch angelegte echte Schulen/Shops. Quelle ist `data/auto-entries.json`, neu bauen mit `python3 tools/build_auto_sql.py`.
- Admin eintragen (nachdem du dich auf der Seite registriert hast), im SQL Editor:
  ```sql
  insert into public.admins (user_id) select id from auth.users where email = 'DEINE@MAIL' on conflict do nothing;
  ```
- Schalter auf der Admin-Seite (in der Datenbank gespeichert): Manual approval, Show demo profiles, Partner program.

Im Supabase-Dashboard einzustellen (geht nicht per SQL):
- Authentication → URL Configuration: Site URL = Adresse der Seite, Redirect URLs = Seite + `http://127.0.0.1:8080/**`
- Authentication → Providers → Email: „Confirm email“ an
- Eigener SMTP-Versand (sobald die Domain-Mailbox existiert), sonst gehen Mails nur an Team-Mitglieder des Supabase-Projekts

## Partnerprogramm

Mitglieder teilen den Link (Insta-Bio, Website) und schicken uns die Stelle über „Become a partner“. Auf der Admin-Seite (Tab „Partners“) Link prüfen und „Give check“: blauer Haken am Profilbild, Partner stehen in Listen oben.

## Automatische Einträge

Echte Schulen/Shops aus öffentlichen Infos, auf der Karte als „Added automatically“ markiert. Die Schule registriert sich über „Is this yours? Claim it“; beim Freigeben ihrer Karte löscht die Datenbank den automatischen Eintrag.

## Noch offen

- Kontakt-E-Mail im Impressum/Datenschutz (Platzhalter), Rechtstexte prüfen lassen
- Domain, GitHub Pages, SMTP, Turnstile, Backup-Action, Uptime-Ping, SEO (OG-Bild, sitemap, robots, llms.txt)
- Mail an Admin bei neuer Karte / Partner-Anfrage (Edge Function)
- Logo
