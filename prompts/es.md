# Guía de Localización de Interfaz para Google Antigravity — Español (`es`)

Traduce las cadenas de interfaz en inglés de Google Antigravity al **español neutro moderno para desarrolladores**, alineado con la terminología oficial de VS Code en español.

## 1. Terminología técnica clave
- **Términos traducidos con naturalidad**:
  - `Agent` -> `Agente` / `Subagent` -> `Subagente` / `Artifact` -> `Artefacto`
  - `Workspace` -> `Espacio de trabajo` / `Sandbox` -> `Entorno aislado` (o `Sandbox` en contextos técnicos breves)
  - `New Conversation` -> `Nueva conversación` / `Side Question` -> `Pregunta rápida`
  - `Settings` -> `Configuración` / `Appearance` -> `Apariencia`
  - `Save` -> `Guardar` / `Cancel` -> `Cancelar` / `Proceed` -> `Continuar`
  - `Background Tasks` -> `Tareas en segundo plano` / `Files Changed` -> `Archivos modificados`
- **Conservar en inglés técnico**: `Git`, `Commit`, `Branch`, `Worktree`, `Diff`, `Hook`, `Token`, `Prompt`, `MCP`, `SSH`, `WSL`, y nombres propios de modelos (`Gemini`, `Claude`, `Antigravity`).
- Usa tratamiento de `tú` conciso y directo; mantén los textos de botones breves para no desbordar la barra lateral.

## 2. Formato de salida (solo JSON)
- Devuelve únicamente un objeto JSON UTF-8 válido: `{"translations": {"Original English": "Traducción en español"}}`
- Prohibido incluir etiquetas HTML (`<`, `>`) o código ejecutable; usa `→` para rutas de menú (`Configuración → Apariencia`).
