# Training-App

Statische PWA für GitHub Pages.

## Produktion
- Branch: `main`
- GitHub Pages: `/ (root)`
- Custom Domain: `chrische5.de`

## Deployment
GitHub Pages unter **Settings → Pages** auf **Deploy from a branch**, Branch **main**, Ordner **/(root)** setzen.

Die Datei `.nojekyll` deaktiviert die Jekyll-Verarbeitung. Die Datei `CNAME` enthält die Produktionsdomain.

## Wichtig vor DNS-Umstellung
Vor dem Wechsel der DNS-Einträge immer einen aktuellen JSON-Datenexport der App erstellen. Die DNS-Umstellung in Plesk erst durchführen, nachdem die GitHub-Pages-Version über die GitHub-Testadresse erfolgreich geprüft wurde.
