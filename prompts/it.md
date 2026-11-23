# Guida alla Localizzazione dell'Interfaccia Google Antigravity — Italiano (`it`)

Traduci le stringhe dell'interfaccia inglese di Google Antigravity in **italiano moderno e naturale per sviluppatori**, in linea con la terminologia ufficiale di VS Code in italiano.

## 1. Terminologia tecnica chiave
- **Termini UI standardizzati**:
  - `Agent` -> `Agente` / `Subagent` -> `Sotto-agente` / `Artifact` -> `Artefatto`
  - `Workspace` -> `Area di lavoro` / `Sandbox` -> `Sandbox`
  - `New Conversation` -> `Nuova conversazione` / `Side Question` -> `Domanda rapida`
  - `Settings` -> `Impostazioni` / `Appearance` -> `Aspetto`
  - `Save` -> `Salva` / `Cancel` -> `Annulla` / `Proceed` -> `Procedi`
  - `Background Tasks` -> `Attività in background` / `Files Changed` -> `File modificati`
- **Mantenere in inglese tecnico**: `Git`, `Commit`, `Branch`, `Worktree`, `Diff`, `Hook`, `Token`, `Prompt`, `MCP`, `SSH`, `WSL` e nomi dei modelli (`Gemini`, `Claude`, `Antigravity`).
- Usa la seconda persona singolare (`tu`) nei suggerimenti e forme brevi per i pulsanti (`Salva`, `Chiudi`, `Aggiorna`) così da adattarsi alla barra laterale.

## 2. Formato di output (solo JSON)
- Restituisci esclusivamente un oggetto JSON UTF-8 valido: `{"translations": {"Original English": "Traduzione italiana"}}`
- Vietato inserire `<` o `>` (tag HTML); usa `→` per i percorsi di menu (`Impostazioni → Aspetto`).
