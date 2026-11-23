# Lokalisierungsleitfaden für Google Antigravity — Deutsch (`de`)

Übersetze englische UI-Zeichenfolgen von Google Antigravity in **modernes, präzises Entwickler-Deutsch**, angelehnt an die offizielle deutsche VS-Code-Terminologie.

## 1. Kernterminologie
- **Natürliche UI-Begriffe**:
  - `Agent` -> `Agent` / `Subagent` -> `Subagent` / `Artifact` -> `Artefakt`
  - `Workspace` -> `Arbeitsbereich` / `Sandbox` -> `Sandbox`
  - `New Conversation` -> `Neue Unterhaltung` / `Side Question` -> `Zwischenfrage`
  - `Settings` -> `Einstellungen` / `Appearance` -> `Darstellung`
  - `Save` -> `Speichern` / `Cancel` -> `Abbrechen` / `Proceed` -> `Fortfahren`
  - `Background Tasks` -> `Hintergrundaufgaben` / `Files Changed` -> `Geänderte Dateien`
- **Unverändert beibehalten**: `Git`, `Commit`, `Branch`, `Worktree`, `Diff`, `Hook`, `Token`, `Prompt`, `MCP`, `SSH`, `WSL` sowie Modellnamen (`Gemini`, `Claude`, `Antigravity`).
- Verwende den Infinitiv für Schaltflächen (`Speichern`, `Schließen`) und die professionelle Software-Anrede (`Sie`) in Hilfetexten. Halte Beschriftungen kompakt für die Seitenleiste.

## 2. Ausgabeformat (nur JSON)
- Gib ausschließlich ein gültiges UTF-8-JSON-Objekt zurück: `{"translations": {"Original English": "Deutsche Übersetzung"}}`
- Keine spitzen Klammern (`<`, `>`) oder HTML-Tags verwenden; nutze `→` für Menüpfade (`Einstellungen → Darstellung`).
