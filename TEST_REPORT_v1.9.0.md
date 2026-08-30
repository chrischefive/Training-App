# Training-App v1.9.0 – Testbericht

## Neue Funktionen
- ✓ Persönliche Bestleistung: neue Trainingseinträge werden gegen Satz- und Tagesrekord geprüft; Testfall meldet `🏆 Neuer Situps-Satzrekord: 35`.
- ✓ Trainingsrhythmus: stärkster Wochentag, leistungsstärkste Stunde und Vergleich nach mindestens zwei Pausentagen.
- ✓ Heute-Dashboard: Situps, Liegestütze, Gewicht, offene Punkte und beide Streaks.
- ✓ Backup-Status: Ampel, Alter des Datei-Backups, neue Datensätze und Gesamtzahl.
- ✓ Lokale Sicherheits-Snapshots: maximal drei Stände in IndexedDB; automatisch vor Training-/Gewichtslöschung und Import; Wiederherstellung verfügbar.
- ✓ Seit letztem Besuch: Zusammenfassung ab zwei Kalendertagen Abstand mit Wiederholungen, Gewichtsänderung und neuen Satzrekorden.
- ✓ Daten-Explorer 2.0: frei wählbarer Zeitraum, Situps/Liegestütze/beide, optionaler Vergleich A gegen B.

## Regression / Sicherheit
- ✓ `node --check` für alle JavaScript-Dateien und Service Worker.
- ✓ Keine doppelten statischen HTML-IDs.
- ✓ Alle eingebundenen Skripte vorhanden.
- ✓ Alle eingebundenen Skripte im Offline-App-Shell-Cache.
- ✓ Datenformat bleibt v8.
- ✓ Neue Besuchs-, Rekord-, Explorer- und Snapshot-Zustände sind nicht Bestandteil von `buildExportPayload()`.
- ✓ Sicherheits-Snapshots werden in IndexedDB statt localStorage gespeichert, damit große Datenbestände nicht am typischen localStorage-Limit scheitern.
- ✓ Lokale Snapshot-Wiederherstellung löst keinen zusätzlichen automatischen Datei-Download aus und verändert den Zeitpunkt des letzten echten Datei-Backups nicht dauerhaft.
- ✓ Bestehende Badge-Funktion bleibt geladen und wird weiterhin als letztes Modul eingebunden.

## Performance
- Neuer Rhythmus-Code aggregiert pro Trainingstyp über Maps/Arrays und vermeidet quadratische Tagesfilterung. Ein synthetischer 100.000-Einträge-Test wurde durchgeführt.

App 1.9.0 · Daten v8 · Offline-Cache v20
