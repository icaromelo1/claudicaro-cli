# Claudicaro CLI — Status de Execução

## Wave 1 ✅ concluída
- [x] T1: Setup Quasar + Electron + Vue 3 + TypeScript — done
- [x] T2: Descoberta / Inventário — done (12 agentes DSG + 4 CAST indexados)

## Wave 2 ✅ concluída
- [x] T3: Setup Prisma + SQLite — done (Prisma 7 + better-sqlite3 adapter, schema 6 modelos)
- [x] T4: Design da arquitetura dispatcher — done (rules.yaml, adapters.md, types.ts)
- [x] T6: Chat UI base — done (ChatPage, ChatMessage, ChatInput, ChatLoading)

## Wave 3 ✅ concluída
- [x] T5: MVP Dispatcher core — done (router.ts + index.ts, failover CONTEXT/TIMEOUT/OVERLOAD/RATE_LIMIT)

## Wave 4 ✅ concluída
- [x] T7: Adapters mínimos — done (ClaudeAdapter, GeminiAdapter, CopilotAdapter)
- [x] T8: Session Manager — done (SessionManager + MemoryWriteBuffer)

## Wave 5 ✅ CORE ✅ concluída
- [x] T9: Integração Chat ↔ Dispatcher ↔ Adapters — done (IPC bridge, streaming, session persistence)

---

## Wave 6 — Features
- [ ] T10: Tokens e Segurança (rate limit tracking, token budget por sessão)
- [ ] T11: Failover e Observabilidade (logs estruturados, AuditLog, health dashboard)
- [ ] T17: Conversation Config Modal ← NOVO
       Modal ao criar nova conversa:
         Passo 1 — CLI (Claude / Gemini / Copilot)
         Passo 2 — Modelo (lista filtrada por CLI)
         Passo 3 — Agente .agent/*.md (dropdown dos agentes indexados)
         Passo 4 — Modo de permissão (bypass / normal / ask)
         Default: claude-sonnet-4-6 + claudicaro + bypass
       O CLI/modelo selecionado fica como orquestrador fixo da sessão,
       sobrescrevendo o roteamento automático do dispatcher.
       Persiste em Session.orchestratorConfig (JSON) no SQLite.

## Wave 7
- [ ] T12: Auth Google (OAuth2 via Electron shell)
- [ ] T13: CLI Config Panel (paths, tokens, defaults por CLI)
- [ ] T14: Workflow Visual BPMN

## Wave 8
- [ ] T15: Testes + CI/CD ← EXPANDIDO
       - Vitest unit: router.ts classifyTask, failover logic, SessionManager
       - E2E CLI health: verifica claude/gemini/gh --version e flags de bypass
       - Integration: dispatch mock end-to-end (sem spawnar CLI real)
       - CI: GitHub Actions workflow (lint + test + build)
- [ ] T16: Operações e Manutenção
