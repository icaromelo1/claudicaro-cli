# Claudicaro CLI — Checkpoint

> Gerado em: 2026-05-13  
> Branch: main | Commits: 30+

---

## O que é

App Electron + Vue 3 + Quasar + TypeScript que funciona como **orquestrador de CLIs de IA** (Claude Code, Gemini CLI, GitHub Copilot). Possui dispatcher inteligente com roteamento por tipo de task, failover automático, chat UI, gestão de sessões com SQLite, e múltiplas telas de configuração/observabilidade.

---

## Arquitetura

```
src-electron/          ← Main process (Node.js)
  ipc/                 ← Handlers IPC (extraídos do electron-main)
  dispatcher/          ← Router, Dispatcher, Failover, Logger, Types
  adapters/            ← ClaudeAdapter, GeminiAdapter, CopilotAdapter
  session/             ← SessionManager, TokenTracker, MemoryWriteBuffer
  auth/                ← Google OAuth2
  config/              ← SettingsStore (settings.json)
  maintenance/         ← BackupManager, LogRotation, UpdateChecker
  sanitize/            ← sanitizeInput, sanitizeArgs
  security/            ← validateCliName, guardDispatch
  metrics/             ← MetricsCollector (ring buffer)

src/                   ← Renderer (Vue 3 + Quasar)
  pages/               ← ChatPage, HealthPage, SettingsPage, WorkflowPage, LoginPage
  components/          ← ChatMessage, ChatInput, ChatLoading, ConversationConfigModal, WorkflowViewer
  composables/         ← useChat.ts
  layouts/             ← MainLayout.vue (APENAS router-view — sem navegação)
  router/              ← routes.ts
  types/               ← claudicaro.d.ts (Window.claudicaro tipado)

prisma/                ← schema.prisma + claudicaro.db (SQLite)
tests/                 ← 92 testes Vitest (unit + integration + E2E CLI health)
docs/playbooks/        ← backup.md, update.md, troubleshooting.md
.github/workflows/     ← ci.yml (lint + test + build)
rules/                 ← rules.yaml (routing rules do dispatcher)
```

---

## O que foi implementado ✅

### Core
| Módulo | Arquivo | Descrição |
|--------|---------|-----------|
| Electron + Quasar | `electron-main.ts`, `quasar.config.ts` | Setup completo, sem warns no console |
| IPC bridge | `src-electron/ipc/index.ts`, `electron-preload.ts` | Todos os handlers expostos ao renderer |
| Dispatcher | `dispatcher/index.ts`, `router.ts`, `failover.ts` | Roteamento por keyword + failover 4 cenários |
| Adapters | `adapters/claude.ts`, `gemini.ts`, `copilot.ts` | Spawn CLI real com streaming de tokens |
| Session Manager | `session/session-manager.ts` | CRUD sessões + histórico no SQLite |
| Token Tracker | `session/token-tracker.ts` | Budget por sessão + AuditLog |
| Sanitize | `sanitize/index.ts` | Remove null bytes, ANSI, trunca 32k |
| Security | `security/index.ts` | Whitelist CLIs, guardDispatch |
| Metrics | `metrics/index.ts` | Ring buffer 1000 entradas, stats por CLI |
| Auth Google | `auth/google.ts` | OAuth2 via shell + HTTP server :9999 |
| Settings | `config/settings-store.ts` | Persiste config em JSON |
| Maintenance | `maintenance/` | Backup SQLite, log rotation, update checker |

### UI (Renderer)
| Página/Componente | Rota | Descrição |
|-------------------|------|-----------|
| `ChatPage.vue` | `/` | Chat principal com sidebar de sessões |
| `HealthPage.vue` | `/health` | Status dos 3 CLIs + logs dispatcher |
| `SettingsPage.vue` | `/settings` | Config CLIs, token budget, orquestrador padrão |
| `WorkflowPage.vue` | `/workflow` | Usa WorkflowViewer |
| `WorkflowViewer.vue` | — | BPMN interativo, nodes animados, chat lateral, export Mermaid |
| `LoginPage.vue` | `/auth` | Google OAuth2 sign-in |
| `ConversationConfigModal.vue` | — | Modal 4 passos ao criar conversa (CLI/Modelo/Agente/Permissão) |
| `useChat.ts` | — | Composable com toda a lógica de estado do chat |

### Testes & CI
- **92 testes** em `tests/` (Vitest): unit router/dispatcher/session, integration mock, E2E CLI health
- **GitHub Actions** CI: lint + test + build em push/PR para main/develop

### Docs
- `docs/playbooks/backup.md`, `update.md`, `troubleshooting.md`

---

## O que está faltando / com problema ❌

### 1. CRÍTICO — Navegação entre páginas
**Problema:** `src/layouts/MainLayout.vue` é só `<router-view />` — não existe nenhuma forma de o usuário navegar para `/health`, `/settings`, `/workflow` ou `/auth`. O app sempre abre direto no chat sem botões de navegação.

**O que precisa:** Adicionar nav bar lateral ou top bar no `MainLayout.vue` com links para todas as páginas.

Sugestão de itens de navegação:
- 💬 Chat (`/`)
- 🔀 Workflow (`/workflow`)
- ❤️ Health (`/health`)
- ⚙️ Settings (`/settings`)
- 👤 Login (`/auth`)

---

### 2. MÉDIO — Testes duplicados
**Problema:** Os testes existem em dois lugares:
- `src-electron/__tests__/` — os originais (46 testes)
- `tests/` — cópias com imports corrigidos (92 testes = 46 duplicados)

**O que precisa:** Decidir qual diretório usar e remover o outro. Recomendado: manter `tests/`, deletar `src-electron/__tests__/`.

---

### 3. MÉDIO — AuthPage.vue duplicada
**Problema:** Existem dois arquivos com o mesmo conteúdo:
- `src/pages/AuthPage.vue`
- `src/pages/LoginPage.vue`

**O que precisa:** Deletar `AuthPage.vue`, manter apenas `LoginPage.vue`.

---

### 4. BAIXO — IndexPage.vue sem uso
**Problema:** `src/pages/IndexPage.vue` existe mas não está em nenhuma rota.

**O que precisa:** Deletar ou aproveitar.

---

### 5. BAIXO — `src-electron/__tests__/` ainda existe após migração
Ver item 2 acima.

---

## Comandos úteis

```bash
# Desenvolver
npm run dev

# Testes
npm test
npm run test:watch

# Build produção
npm run build

# Backup manual
npx ts-node scripts/backup.ts

# Verificar atualização
npx ts-node scripts/check-update.ts

# Rebuild nativas (após update do Electron)
npx @electron/rebuild -f -w better-sqlite3
```

---

## Próximos passos sugeridos (por prioridade)

| # | Prioridade | Task | Esforço |
|---|-----------|------|---------|
| 1 | 🔴 CRÍTICO | Adicionar navegação no MainLayout.vue | Pequeno |
| 2 | 🟡 MÉDIO | Remover duplicação de testes (src-electron/__tests__/) | Pequeno |
| 3 | 🟡 MÉDIO | Deletar AuthPage.vue (manter LoginPage.vue) | Trivial |
| 4 | 🟢 BAIXO | Deletar IndexPage.vue sem uso | Trivial |
| 5 | 🟢 BAIXO | Página de Manutenção na UI (acionar backup, ver update) | Médio |
| 6 | 🟢 BAIXO | Exibir métricas (MetricsCollector) na HealthPage | Médio |
