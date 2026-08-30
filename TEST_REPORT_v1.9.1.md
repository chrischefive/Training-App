# Training-App v1.9.1 – Testbericht

- ✓ JavaScript-Syntax aller App-Dateien und des Service Workers geprüft
- ✓ Keine doppelten statischen HTML-IDs
- ✓ Alle eingebundenen Skripte vorhanden
- ✓ Alle eingebundenen Skripte im Offline-App-Shell, inklusive `features191.js`
- ✓ App-Version 1.9.1 / Offline-Cache v21
- ✓ Datenformat bleibt v8
- ✓ UI-Präferenz `Heute anzeigen` ist nicht Bestandteil des JSON-Backups
- ✓ `Heute`-Dashboard wird aus dem Log in einen globalen Slot unterhalb der Hauptnavigation verschoben
- ✓ `Heute anzeigen` ist standardmäßig aktiv und kann global vollständig ausgeblendet werden
- ✓ Explorer-Zeiträume wurden in responsive Von/Bis-Felder umgebaut
- ✓ Vergleichszeitraum respektiert Ein/Aus und verwendet auf schmalen Displays einspaltiges Layout
- ✓ Inputs, Selects, Textareas, Checkboxen und Fokuszustände verwenden Theme-Variablen
- ✓ CSS-Klammerbalance geprüft

Hinweis: Echte Safari-/iOS-Renderingtests sind in dieser Laufzeitumgebung nicht verfügbar. Die responsive Logik wurde deshalb statisch und über die Breakpoints 380 px / darüber geprüft.
