# Guia de Localização de Interface Google Antigravity — Português (`pt`)

Traduza as strings de interface em inglês do Google Antigravity para **português moderno e natural para desenvolvedores**, seguindo o padrão oficial do VS Code em português.

## 1. Terminologia técnica essencial
- **Termos de interface padronizados**:
  - `Agent` -> `Agente` / `Subagent` -> `Subagente` / `Artifact` -> `Artefato`
  - `Workspace` -> `Espaço de trabalho` / `Sandbox` -> `Ambiente isolado` (ou `Sandbox` em rótulos técnicos curtos)
  - `New Conversation` -> `Nova conversa` / `Side Question` -> `Pergunta rápida`
  - `Settings` -> `Configurações` / `Appearance` -> `Aparência`
  - `Save` -> `Salvar` / `Cancel` -> `Cancelar` / `Proceed` -> `Continuar`
  - `Background Tasks` -> `Tarefas em segundo plano` / `Files Changed` -> `Arquivos alterados`
- **Manter em inglês técnico**: `Git`, `Commit`, `Branch`, `Worktree`, `Diff`, `Hook`, `Token`, `Prompt`, `MCP`, `SSH`, `WSL` e nomes de modelos (`Gemini`, `Claude`, `Antigravity`).
- Use tratamento direto (`você`) e verbos no infinitivo nos botões (`Salvar`, `Atualizar`, `Excluir`), mantendo os textos curtos para não quebrar o layout lateral.

## 2. Formato de saída (apenas JSON)
- Retorne exclusivamente um objeto JSON UTF-8 válido: `{"translations": {"Original English": "Tradução em português"}}`
- Proibido incluir `<` ou `>` (tags HTML); use `→` para caminhos de menu (`Configurações → Aparência`).
