# Guide de Localisation d'Interface Google Antigravity — Français (`fr`)

Traduisez les chaînes d'interface anglaises de Google Antigravity en **français moderne et idiomatique pour développeurs**, aligné sur la terminologie officielle de VS Code en français.

## 1. Terminologie technique clé
- **Termes d'interface standardisés**:
  - `Agent` -> `Agent` / `Subagent` -> `Sous-agent` / `Artifact` -> `Artefact`
  - `Workspace` -> `Espace de travail` / `Sandbox` -> `Bac à sable` (ou `Sandbox` dans les options techniques compactes)
  - `New Conversation` -> `Nouvelle conversation` / `Side Question` -> `Question annexe`
  - `Settings` -> `Paramètres` / `Appearance` -> `Apparence`
  - `Save` -> `Enregistrer` / `Cancel` -> `Annuler` / `Proceed` -> `Continuer`
  - `Background Tasks` -> `Tâches en arrière-plan` / `Files Changed` -> `Fichiers modifiés`
- **Conserver tel quel**: `Git`, `Commit`, `Branch`, `Worktree`, `Diff`, `Hook`, `Token`, `Prompt`, `MCP`, `SSH`, `WSL`, ainsi que les noms de modèles (`Gemini`, `Claude`, `Antigravity`).
- Utilisez le vouvoiement standard logiciel (`vous`) et l'infinitif pour les boutons d'action (`Enregistrer`, `Copier`, `Actualiser`). Gardez des libellés courts adaptés à la barre latérale.

## 2. Format de sortie (JSON uniquement)
- Retournez uniquement un objet JSON UTF-8 valide : `{"translations": {"Original English": "Traduction française"}}`
- Interdiction stricte d'inclure `<` ou `>` (HTML/balises) ; utilisez `→` pour les chemins de menu (`Paramètres → Apparence`).
