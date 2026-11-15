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

## Noch offen

- `store-supabase.js` + `supabase/schema.sql` (RLS, Spaltenrechte, Speicherfunktionen, Meldungen, Admin, Fotos)
- Rechtsseiten (`terms.html`, `privacy.html`, `imprint.html` sind Platzhalter), Betreiber klären
- Turnstile, Backup-Action, Uptime-Ping, SEO (OG-Bild, sitemap, robots, llms.txt)
- Domain und Hosting
