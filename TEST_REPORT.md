# Testbericht – modularisierte iPhone/Netlify-Version

Stand: Deepcheck nach QoL-Erweiterungen.

## Geprüfte Struktur
- Alle JavaScript-Dateien einzeln mit `node --check`: bestanden.
- Service Worker Syntax: bestanden.
- Keine doppelten statischen HTML-IDs.
- Keine fehlenden statischen DOM-Ziele in den App-Skripten.
- Alle in `index.html` referenzierten lokalen Dateien vorhanden.
- Alle App-Shell-Dateien im Service-Worker-Cache enthalten.
- CSS-Klammerstruktur konsistent.
- Alle fünf Themes weiterhin vorhanden.
- Cache-Version auf `training-app-v3-deepchecked` angehoben, damit alte Test-Caches nicht hängen bleiben.

## Simulierte Browser-Laufzeit
Die komplette Script-Reihenfolge wurde in einer DOM-/Storage-/Canvas-Simulation geladen. Initialisierung ohne Laufzeitfehler.

Geprüft:
- Startzustand Log / Situps.
- Log ↔ Statistik.
- Statistik → Gewicht → Liegestütze behält Statistik bei.
- Zurück auf Log funktioniert.
- Optionen öffnen.
- Gewicht/KFA speichern und bearbeiten.
- Diagramm-Funktionen mit 0, 1 und extrem auseinanderliegenden Werten.
- Alle fünf Theme-/Ringpfade ohne Laufzeitausnahme.

## Trainingslogik
- Zwei erfüllte Liegestütz-Tage: aktuelle Streak 2, längste Streak 2, Trainingstage 2.
- Drei erfüllte Tage inklusive heute: 3 / 3 / 3.
- Lücke: aktuelle Streak 0.
- Zukunftseinträge aus Imports werden nicht in Gesamtwert, Trainingstage, Rekorde oder Vergleichsstatistiken eingerechnet.
- Beide Zielhistorien (Situps/Liegestütze) werden bei Änderungen separat und korrekt fortgeführt.
- Doppelte importierte Trainings-IDs werden eindeutig normalisiert.
- Startwerte bleiben getrennt und werden exportiert/importiert.

## Gewichtslogik
- Gewicht + Körperfett werden gemeinsam gespeichert.
- Bearbeitung von Gewicht, KFA und Uhrzeit funktioniert.
- Ungültiges Gewicht wird abgewiesen.
- Neue Zukunftsmessungen werden abgewiesen.
- Importierte Zukunftsmessungen werden nicht als aktuelles Gewicht, nicht für Kalorien und nicht für Periodendurchschnitte verwendet.
- Kalorien verwenden das letzte gültige Gewicht bis heute.
- Doppelte importierte Gewicht-IDs werden normalisiert.
- Undo nach Gewichtslöschung stellt Messung und ursprüngliche Zielplan-Basis wieder her.

## Zielgewicht / Termin
- Abnahme, Zunahme und Gewicht-halten werden unterschieden.
- Am Starttag wird „genau im Plan“ statt „0,0 kg vor Plan“ angezeigt.
- Soll-Linie endet am Zieltermin und wird danach nicht extrapoliert.
- Nach Zieltermin wird der letzte Messwert bis zum Termin bewertet.
- Neuer Termin in der Vergangenheit wird abgewiesen.
- „Termin entfernen“ löscht nur Termin + Soll-Linie; Zielgewicht bleibt erhalten.
- `sourceEntryId` der Planbasis wird jetzt auch lokal persistent gespeichert.
- Vollständiger Export→Import-Roundtrip erhält Zielgewicht, Termin, Startwert des Plans und `sourceEntryId`.

## Import / Export
- Export enthält nur Nutzdaten + technische `exportVersion`; Theme und UI-Navigation fehlen bewusst.
- Sehr altes Backup mit `weightKg` ohne Gewichtshistorie wird migriert.
- Zukünftige Backups mit unbekannten Zusatzfeldern werden toleriert.
- `{}` wird als ungültig abgewiesen und löscht bestehende Daten nicht.
- Bekannte Felder mit falschem Grundtyp werden abgewiesen und löschen bestehende Daten nicht.
- Vollständiger Roundtrip geprüft für Training, Ziele, Zielhistorien, Startwerte, Gewicht, KFA, Zielgewicht, Wunschtermin und Zielplan.

## QoL
- Undo für Trainingslöschung.
- Undo für Gewichtslöschung inklusive Zielplan.
- „Letzten Satz wiederholen“ ignoriert Zukunftseinträge.
- „Heute bearbeiten“ direkt bei den Schnellaktionen.
- Live-Tagesfortschritt und Über-Ziel-Anzeige.
- Gewicht/KFA werden mit letzter gültiger Messung vorausgefüllt.
- „Jetzt“-Schnellwahl für Datum/Uhrzeit.
- Tastatur wird nach erfolgreicher Eingabe geschlossen.
- Kompakter Zielplanstatus.
- Diagramm-Tap zeigt exakte Werte für 14-Tage-Training, kumulierten Fortschritt, Rohgewicht, KFA, Fettmasse sowie 6-Wochen-/6-Monatsmittel.
- Backup-Hinweis nach 20 neuen Datensätzen zusätzlich zur bestehenden 7-Tage-Erinnerung.
- QoL-Backupzähler greift defensiv auf Storage zu.
- `prefers-reduced-motion` berücksichtigt.

## Offline / Netlify
- Service Worker cached HTML, CSS, Manifest und alle JS-Dateien.
- Navigation: network-first mit Offline-Fallback.
- CSS/JS: Cache mit Hintergrundaktualisierung.
- `_headers` verhindert langes Caching von `sw.js`, `index.html` und Manifest.
- Neue Cache-Version erzwingt sauberes Update des Testbuilds.

## Einschränkung
Ein realer Safari-Test auf einem physischen iPhone kann in dieser Umgebung nicht ersetzt werden. Ein Headless-Chromium-Aufruf wurde versucht, lokale Navigation ist hier jedoch administrativ blockiert. Deshalb wurden DOM-Laufzeit, Datenlogik und Roundtrips isoliert und reproduzierbar getestet.


## Keramik-Theme
- Als sechstes Theme in die bestehende Theme-Auswahl integriert.
- Nur CSS/Theme-Konfiguration ergänzt; Daten-, Import-/Export- und Trainingslogik unverändert.
- Mehrfarbiger geometrischer Hintergrund ohne externe Bilddateien, daher vollständig offline-cachebar.
- Cremefarbene Oberflächen und themeabhängige Akzente für Ring, Navigation, Eingabe und Diagramme.
- Service-Worker-Cache auf `training-app-v4-keramik` angehoben.
- JS-Syntax, statische IDs und CSS-Struktur nach Integration erneut geprüft.


## Backup-Versionsschutz + Keramik-Kontrast
- Aktuelles Datenformat zentral als `CURRENT_EXPORT_VERSION = 8`.
- Backup ohne Versionsnummer wird als Legacy v1 behandelt.
- Ältere Backups werden automatisch migriert; fehlende Felder bleiben default/leer.
- Gleiches Format wird ohne Warnung importiert.
- Neueres Backup zeigt vor jeglichem Überschreiben eine explizite Warnung; Abbrechen lässt den aktuellen Datenbestand unangetastet.
- Bei bewusstem Import eines neueren Formats werden bekannte Felder übernommen, unbekannte ignoriert und der Status bleibt als Warnung sichtbar.
- Export schreibt weiterhin v8; UI-Zustände/Themes bleiben ausgeschlossen.
- Keramik-Hilfs-/Erklärungstexte haben dunklere Textfarbe und hellere/opaquere Untergründe.
- Service-Worker-Cache auf `training-app-v5-backup-guard` angehoben.


## Abschluss-Sicherheitsfunktionen
- Import-Vorschau ergänzt: Backupversion, Kompatibilitätsstatus, Anzahl Training/Gewicht, Datenzeitraum, Zielgewicht und optionaler Zieltermin.
- Vorschau funktioniert sowohl bei eingefügtem JSON-Text als auch unmittelbar nach Dateiauswahl.
- Ungültiger Text wird nur als Vorschaufehler markiert und verändert keine Daten.
- Diagnoseblock in Optionen: Datenformat, Datensatzanzahlen, Zeitpunkt des letzten Datei-Backups, lokaler Speicherzugriff und Service-Worker-Verfügbarkeit.
- Diagnose-/Vorschaucode ist rein lesend; Import-/Exportdatenformat bleibt v8 unverändert.
- Theme/UI-Zustand weiterhin nicht im Datenexport.
- `safety-ui.js` in Offline-App-Shell aufgenommen; Cache auf `training-app-v6-safety-ui` angehoben.
- Alle JS-Dateien + Service Worker erneut per Syntaxprüfung geprüft.
- Keine doppelten statischen IDs, keine fehlenden Scriptdateien, alle Scripts im Offline-Cache.


## Extremfall-Deepcheck – final
Zusätzlich geprüft und gehärtet:
- Dateiauswahl importiert nicht mehr automatisch. Auswahl lädt nur die Vorschau; Überschreiben erfolgt erst über „Importieren“.
- 20-MB-Schutz greift vor `JSON.parse` und bereits vor dem `FileReader`, um Safari bei versehentlich riesigen Dateien zu schützen.
- Harte Obergrenzen für absurde Importmengen: 250.000 Trainingseinträge / 100.000 Gewichtsmessungen.
- Nicht-leere Datenbereiche, die vollständig ungültig sind, werden abgewiesen.
- Teilweise ungültige Backups zeigen vor dem Überschreiben exakt an, dass Datensätze verworfen würden; Abbrechen lässt den Bestand unverändert.
- Zukünftige Backupversion kann weiterhin abgebrochen werden, bevor irgendein Datenbestand überschrieben wird.
- `{}` und beschädigte bekannte Felder verändern den bestehenden Bestand nicht.
- Zukunfts-Trainingseinträge werden aus Statistik/Streak ausgeschlossen; Zukunfts-Gewichte aus aktuellem Gewicht, Kalorien und Durchschnittsstatistiken.
- Streak mit 50.000 simulierten Einträgen getestet; Berechnung auf einmalige Tagesindexierung optimiert.
- 2 Liegestütz-Tage: aktuell 2 / längste 2 / Trainingstage 2.
- Vollständiger v8 Export→Import-Roundtrip mit Training, Zielen, Zielhistorien, Startwerten, Gewicht, KFA, Wunschgewicht, Wunschtermin und Planbasis.
- Zieltermine: Vergangenheit wird bei Neuanlage abgewiesen; Termin entfernen lässt Wunschgewicht bestehen.
- Nach abgelaufenem Zieltermin wird ein älterer Messwert nicht mehr fälschlich als Messung „am Termin“ bezeichnet.
- Exakte Messung am Zieltermin wird korrekt als erreicht/verfehlt bewertet.
- Gewicht/KFA: Zukunftseingaben und ungültige Werte werden abgewiesen.
- Alle JS-Dateien und Service Worker syntaktisch geprüft; keine doppelten IDs; keine fehlenden statischen DOM-Referenzen.
- Alle Scriptdateien befinden sich im Offline-App-Shell-Cache.
- Alle sechs Themes vorhanden.
- Service Worker auf `training-app-v7-extremechecked` angehoben.


## Post-Extremcheck
Weitere Prüfungen und Korrekturen:
- IndexedDB-Selbstheilung reagiert jetzt nicht nur auf fehlende, sondern auch auf syntaktisch oder inhaltlich beschädigte localStorage-Werte.
- Trainingseinträge/Gewichtslisten werden bei Recovery auch inhaltlich validiert; ein formal gültiges, aber vollständig kaputtes Array wird nicht mehr als gesund betrachtet.
- Ziele, Startwerte, Zielhistorie, Theme und Navigationszustand werden vor Recovery plausibilisiert.
- Doppelte Zielhistorien-Einträge mit gleichem `from`-Datum werden deterministisch zusammengeführt; der letzte gültige Eintrag gewinnt.
- Service Worker löscht beim Update nur eigene `training-app-*`-Caches und keine fremden Caches derselben Domain.
- Sumi-Sekundärtext minimal abgedunkelt; Kontrast jetzt oberhalb der üblichen 4,5:1-Grenze für kleinen Text.
- Künstliche 3.650-Tage-Grenze der aktuellen Streak entfernt.
- Expliziter 4.001-Tage-Test: aktuelle Streak 4001, längste Streak 4001, Trainingstage 4001.
- 50.000-Einträge-Stresstest weiterhin bestanden.
- Alle bisherigen Import-/Export-, Zielgewichts-, Zukunftsdaten- und beschädigte-Backup-Tests weiterhin bestanden.
- Alle JS-Dateien + Service Worker syntaktisch sauber; keine doppelten IDs oder fehlenden statischen DOM-Referenzen.
- Offline-Cache auf `training-app-v9-postextreme` angehoben.


## Sichtbare Versions-/Updateanzeige
- Optionen zeigen `App 1.1.0 · Daten v8 · Cache v10`.
- „Auf Update prüfen“ stößt die Service-Worker-Prüfung an.
- „App neu laden“ erzwingt einen neuen Ladezyklus.
- `controllerchange` lädt nach Übernahme eines neuen Service Workers automatisch neu.
- Offline-Cache: `training-app-v10-visible-version`.


## Feature Pack 1.2.0
Neu:
- Persönliche Gewichtsrekorde (Minimum, Maximum, niedrigster KFA) zusätzlich zu bestehenden Trainingsrekorden.
- Verspielte Meilenstein-Boards für Training und Gewicht.
- „Vor einem Jahr“ mit sauberem Fallback, wenn keine Vergleichsdaten existieren.
- 8-Wochen-Trainingstrend und 8-Wochen-Gewichtstrend.
- Gewichtsprognose nur bei ausreichend langer/stabiler Datenbasis und Trend in Zielrichtung.
- Beständigkeit über 30 abgeschlossene Tage; der noch laufende heutige Tag verfälscht die Quote nicht.
- Diagrammvergleich: Training 14 Tage vs. vorherige 14; Gewicht 6 Wochen/6 Monate vs. direkt vorheriger Zeitraum.
- Vergleichsdiagramme verwenden einen gemeinsamen Maßstab; die Gewicht-Soll-Linie bleibt berücksichtigt.
- Datenqualitätscheck auf Zukunftsdaten und auffällige kurzzeitige Gewicht-/KFA-Sprünge.
- Backup-Gesundheitscheck prüft Erzeugbarkeit, Datensatzanzahlen, Alter des Datei-Backups und neue Datensätze seit Backup.
- App-Version 1.2.0 · Datenformat weiterhin v8 · Offline-Cache v11.

Regression:
- Vollständige vorherige Extremtest-Suite erneut ausgeführt.
- 2-Tage-Streak-Konsistenz, Zukunftsdaten-Ausschluss, v8 Roundtrip, kaputte/teilkaputte/übergroße Backups, Zieltermine, 50.000-Einträge-Stresstest und 4.001-Tage-Streak weiterhin bestanden.
- Neue Vergleichsschalter und Insight-Fallbacks in Laufzeitsimulation geprüft.
- Alle JS-Dateien und Service Worker syntaktisch sauber.
- Keine doppelten statischen IDs; alle Scriptdateien vorhanden und im Offline-App-Shell-Cache.
- Exportformat unverändert; Vergleichsmodus, Meilensteine und andere reine UI/abgeleitete Werte werden nicht gespeichert.


## Dynamische Achievements – App 1.3.0
- Feste Meilensteinliste durch automatisch skalierende Herausforderungen ersetzt.
- Pro Bereich maximal drei aktuelle Herausforderungen.
- Training skaliert automatisch über Gesamtwiederholungen, Trainingstage und Ziel-Streak.
- Gewichtsbereich skaliert über Messroutine, relativen Weg zum Wunschgewicht und KFA-Verbesserung.
- Wunschgewichts-Fortschritt ist richtungsabhängig; Bewegung vom Ziel weg erzeugt keinen falschen Fortschritt.
- Falls vorhanden, wird für Zielweg-Achievements die gespeicherte Zielplanbasis verwendet.
- Ahnengalerie wird vollständig aus Rohdaten rekonstruiert und enthält rekonstruierbare Erreichungsdaten.
- Relative historische Auszeichnungen: 30-Tage-Zielquote (80/90/95 %) und regelmäßige Gewichtsmessungen.
- Keine Achievement-, Challenge-, Galerie- oder Meilensteinzustände im Export. Backupformat bleibt v8.
- Wiederholter Neuaufbau der Galerie liefert bei unveränderten Daten deterministisch dasselbe Ergebnis.
- Theme-spezifische Darstellung ergänzt, u. a. Bauhaus-Farbkanten, Sumi-Siegel und Keramik-Kacheln.
- Vollständige bisherige Extrem-/Regressionstests erneut bestanden, inkl. 50.000 Einträge, 4.001-Tage-Streak, Import-/Export-Roundtrip, beschädigte Backups, Zukunftsdaten und Zieltermine.
- App 1.3.0 · Daten v8 · Cache v12.


## v1.4.0 – Messverlauf, Prozentzeiten, Diagramme & Massendaten
- Gewicht-Messverlauf ist standardmäßig eingeklappt; Zähler im Titel.
- Lange Gewichtshistorien werden in 100er-Paketen gerendert (reduziert DOM-Last auf iPhone).
- Gewicht kann weiterhin mit frei gewähltem vergangenem Datum und Uhrzeit nachgetragen werden; Zukunft bleibt gesperrt.
- Nachgetragene Trainingssätze verwenden für Tageszeitstatistik exakt die am Satz gespeicherte Uhrzeit.
- Tageszeit-Verteilung zeigt Prozentanteile und skaliert gegen 100 %, statt den größten Block künstlich auf volle Höhe zu ziehen.
- Horizontale Hilfslinien ergänzt: 14-Tage-Training, kumulierter Fortschritt und Gewicht/KFA/Fettmasse. Gewichtsmittelwert-Charts hatten bereits Hilfslinien.
- Diagramm-Zoom verwendet jetzt eine große Canvas-Zeichenfläche und skaliert das Diagramm auf den verfügbaren Bildschirmbereich; Resize/Rotation aktualisiert die Großansicht.
- Backupformat unverändert v8; neue Funktionen speichern keinen zusätzlichen Backupzustand.
- Syntaxcheck aller JS-Dateien + Service Worker bestanden; 174 DOM-IDs ohne Duplikate; alle statischen getElementById-Referenzen aufgelöst.
- Massendaten-Serialisierung separat geprüft (100.000 Trainingseinträge + 10.000 Gewichtsmessungen) inklusive JSON-Roundtrip.
- App 1.4.0 · Daten v8 · Cache v13.

## App 1.5.0 – Explorer / flexible Diagramme / Performance
- Trainingsdiagramm: 14 Tage, 30 Tage, 3 Monate, 1 Jahr, Alles.
- Rekordtag wird im Trainingsdiagramm mit Pokal markiert.
- Daten-Explorer mit stärkstem Monat/Woche/Wochentag, Leistungsstunde, Satzdurchschnitt, Zielquote und längster Pause.
- „Damals vs. heute“ vergleicht 30 Tage mit demselben Zeitraum vor einem Jahr; sauberer Fallback ohne Altdaten.
- Performance-Testmodus erzeugt 10k/50k/100k Testeinträge ausschließlich im Arbeitsspeicher; echte Daten werden nicht überschrieben oder gespeichert.
- 7-Tage-Dateibackup-Erinnerung bleibt unverändert aktiv.
- Exportvertrag unverändert: UI-/Explorer-/Performancezustände sind nicht Bestandteil des Backups; Datenformat bleibt v8.
- Statische Regression: alle JS-Dateien + Service Worker Syntaxcheck, keine doppelten IDs, alle Skripte vorhanden und im Offline-App-Shell, CSS-Klammern konsistent.
- App 1.5.0 · Daten v8 · Cache v14.


## Homescreen-Badge & Diagramme – App 1.6.0
- Homescreen-Badge über Badging API: ausschließlich heutige offene Punkte Situps/Liegestütze/Gewicht, hart auf 0–3 begrenzt.
- Badge-Test mit echtem Badge-Modul: 3 → 2 → 1 → 0; am Folgetag wieder 3; alte Einträge werden nicht übertragen.
- Badge wird bei App-Fokus, pageshow, Sichtbarwerden sowie nach Training-/Gewichtsrendering synchronisiert.
- Aktivierung erfolgt bewusst per Nutzerbutton, damit iOS die erforderliche Berechtigung anfordern kann.
- Badge-Zustand wird nicht exportiert; Backupformat bleibt v8.
- Diagramm-Großansicht nutzt 100vw × 100dvh. X/Y werden unabhängig an die verfügbare Fläche angepasst; Rotation löst Neuzeichnen aus.
- Adaptive X-Achse: 14 Tage 14 Labels; 30 Tage ca. 7; 90 Tage ca. 10; 1 Jahr ca. 13; sehr lange Verläufe Jahresmarken.
- Vollständiger JS-/Service-Worker-Syntaxtest bestanden, keine doppelten IDs, alle Skripte vorhanden und offline gecacht, CSS-Klammern ausgeglichen.
- App 1.6.0 · Daten v8 · Cache v15.


## App 1.7.0 – Homescreen-Icon & Updateprüfung
- Neues PNG-Homescreen-Icon in 180, 192 und 512 px eingebaut.
- Apple-Touch-Icon und Web-App-Manifest referenzieren die neuen Dateien.
- Icons liegen im Offline-App-Shell-Cache.
- Updateprüfung verwendet zusätzlich einen cache-busting Server-Probe mit `cache: no-store`.
- Ein Safari-Fehler bei `ServiceWorkerRegistration.update()` wird nicht mehr fälschlich als kompletter Prüfungsfehler behandelt.
- Offline- und Server-nicht-erreichbar-Zustände werden getrennt und verständlich angezeigt.
- Alle JavaScript-Dateien + Service Worker per `node --check` geprüft.
- Keine doppelten HTML-IDs; alle Skripte vorhanden und offline gecacht.
- Backupvertrag unverändert; Datenformat bleibt v8.
- App 1.7.0 · Daten v8 · Cache v16.


## Korrektur 1.7.1 – echtes Diagramm-Neuzeichnen + iOS-Icon
- Großansicht verwendet kein `drawImage()`/Canvas-Stretching mehr.
- Trainings-, Fortschritts-, Gewichts-, KFA-, Fettmassen- und Durchschnittsdiagramme akzeptieren eine separate Ziel-Canvas und echte Zielabmessungen.
- Beim Öffnen, Drehen und Resize wird aus den Rohdaten neu gerendert; X/Y-Skalierung, Raster und Labels werden für die neue Fläche neu berechnet.
- Aktiver Trainings-Zeitraum (14T/30T/3M/1J/Alles) wird auch in der Großansicht verwendet.
- iOS-Icon-Kette erweitert: Root `apple-touch-icon.png`, precomposed-Fallback, 120/152/167/180 px sowie Manifest 192/512.
- Icon-PNGs sind quadratisch, RGB und ohne Transparenz.
- Icon- und Manifest-Ressourcen werden in Netlify mit `no-cache` ausgeliefert; Service-Worker-Cache auf v17 erhöht.
- Datenformat unverändert v8; Zoom/Icon/UI-Zustände nicht im Export.
- Alle JS-Dateien und Service Worker per `node --check` geprüft; keine doppelten IDs; alle Skripte vorhanden und offline gecacht.
