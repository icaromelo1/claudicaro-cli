# Icarus Code

> Orquestrador de CLIs de IA para desktop — Claude Code, Gemini CLI e GitHub Copilot em uma única interface.

Um app Electron + Vue 3 que age como dispatcher inteligente entre os três principais CLIs de IA. Você escreve o prompt uma vez — o Icarus decide qual CLI usa, com failover automático se um falhar.

---

## O que faz

- **Dispatcher com roteamento por keyword** — detecta o tipo da task (busca web, análise de logs, lint, decisão arquitetural, sugestão de shell) e roteia para o CLI + modelo mais adequado
- **Failover automático** — se o CLI primário falhar (timeout, rate limit, contexto cheio), redireciona para o próximo sem interromper o usuário
- **Chat com streaming real** — tokens chegam em tempo real via IPC Electron, com histórico persistido em SQLite
- **Gestão de sessões** — cria, nomeia, filtra e retoma conversas anteriores; cada sessão tem CLI/modelo/agente configuráveis
- **Health Page** — status em tempo real dos três CLIs + logs do dispatcher
- **Workflow BPMN visual** — visualizador interativo de fluxos com nodes animados, chat lateral e export Mermaid
- **Google OAuth2** — login com conta Google direto no Electron
- **92 testes automatizados** — unit, integration e E2E CLI health via Vitest + GitHub Actions CI

---

## Stack

| Camada | Tecnologia |
|---|---|
| Desktop | Electron 31 |
| UI | Vue 3 + Quasar v2 + TypeScript |
| Estado | Pinia |
| Banco local | SQLite via Prisma 7 + better-sqlite3 |
| Testes | Vitest (92 testes) |
| CI | GitHub Actions (lint + test + build) |
| Auth | Google OAuth2 (HTTP server :9999) |

---

## Arquitetura

```
src-electron/                  ← Main process (Node.js)
  dispatcher/                  ← Router + Dispatcher + Failover + Logger
  adapters/                    ← ClaudeAdapter, GeminiAdapter, CopilotAdapter
  session/                     ← SessionManager + TokenTracker + MemoryWriteBuffer
  ipc/                         ← Handlers IPC expostos ao renderer
  auth/                        ← Google OAuth2
  config/                      ← SettingsStore (JSON)
  maintenance/                 ← BackupManager, LogRotation, UpdateChecker
  metrics/                     ← MetricsCollector (ring buffer 1000 entradas)
  sanitize/ + security/        ← Input sanitization + CLI whitelist

src/                           ← Renderer (Vue 3 + Quasar)
  pages/
    ChatPage.vue               ← Chat principal com sidebar de sessões
    HealthPage.vue             ← Status dos 3 CLIs + logs dispatcher
    SettingsPage.vue           ← Config CLIs, token budget, orquestrador padrão
    WorkflowPage.vue           ← Workflow BPMN visual
    LoginPage.vue              ← Google OAuth2
  composables/useChat.ts       ← Toda a lógica de estado do chat

prisma/                        ← schema.prisma + icarus.db (SQLite)
rules/rules.yaml               ← Regras de roteamento do dispatcher
tests/                         ← 92 testes Vitest
.github/workflows/ci.yml       ← Lint + test + build em push/PR
```

---

## Tabela de roteamento

| Keywords na task | CLI | Modelo |
|---|---|---|
| search, buscar, web, docs, changelog | Gemini | Flash |
| log analysis, audit, cross-repo, long context | Gemini | Pro |
| imagem, screenshot | Gemini | Flash |
| lint, sonar, commit message, resumo | Claude | Haiku |
| architecture, adr, system design | Claude | Opus |
| shell, command, sugere comando | Copilot | — |
| *(padrão)* | Claude | Sonnet |

---

## Como rodar

```bash
# Pré-requisitos: Node 22 LTS, Claude Code CLI, Gemini CLI, GitHub Copilot CLI instalados

npm install

# Desenvolvimento
npm run dev

# Testes
npm test
npm run test:watch

# Build produção (.dmg macOS / .exe Windows)
npm run build

# Linting
npm run lint
```

---

## Configuração mínima

Crie um arquivo `settings.json` (gerado automaticamente no primeiro run) ou configure via Settings Page:

- Caminho dos executáveis de cada CLI
- Token budget por sessão
- CLI/modelo padrão ao criar conversas

---

## Telas

| Rota | Descrição |
|---|---|
| `/` | Chat principal — cria e retoma sessões |
| `/health` | Status dos 3 CLIs, latência, logs do dispatcher em tempo real |
| `/settings` | Configura CLIs, token budget, orquestrador padrão |
| `/workflow` | Visualizador BPMN interativo com export Mermaid |
| `/auth` | Login Google OAuth2 |

---

## Status

Em desenvolvimento ativo. Core do dispatcher, chat, sessões, auth e CI estão completos.

---

*Projeto pessoal — Icaro Melo, 2026.*
