# Icarus Code — Status de Execução

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
- [x] T9: Integração Chat ↔ Dispatcher ↔ Adapters — done (IPC em src-electron/ipc/, useChat composable, streaming, session persistence)

---

## Wave 6 ✅ concluída
- [x] T10: Tokens, Segurança e Sanitize layer — done (TokenTracker, sanitize/index.ts, security/index.ts, guardDispatch nos 3 adapters)
- [x] T11: Failover e Observabilidade — done (failover.ts módulo separado, MetricsCollector ring-buffer, HealthPage)
- [x] T12: Auth Google — done (OAuth2 Electron shell, servidor HTTP :9999, LoginPage.vue)
- [x] T13: CLI Config Panel — done (SettingsStore JSON, SettingsPage 3 seções)
- [x] T17: Conversation Config Modal — done (4 passos, orchestratorConfig, default claude-sonnet-4-6+bypass)

## Wave 7 ✅ concluída
- [x] T14: Workflow Visual BPMN — done (WorkflowViewer.vue interativo: nodes animados, chat lateral, export Mermaid)
- [x] T15: Testes + CI/CD — done (92 testes em tests/, E2E CLI health, GitHub Actions CI)

## Wave 8 ✅ concluída
- [x] T16: Operações e Manutenção — done (BackupManager, LogRotation, UpdateChecker, docs/playbooks/)

---

## Escritório multiagente (fases 1–6 ✅ implementadas fora deste repo, fase 7 pendente)

Spec: `docs/design/2026-08-02-escritorio-multiagente.md`
Código: `pessoal/escritorio/` (repo próprio, 103 testes, instalado e em uso)

Camada de comunicação **peer-to-peer entre sessões Claude Code** — servidor MCP standalone,
fora do Electron. Sessões e especialistas viram pessoas
endereçáveis por nome, conversando por `ask()`/`dm()` dentro de threads, com quadro branco
compartilhado e `claim()` de recursos.

O que isso significa pra este repo:

- O Icarus **não** é o dono do escritório — entra como cliente na fase 7 do spec.
- `PeerGroup`/`PeerGroupMember`/`PeerTurn` viram **caso particular de thread** (rodízio fixo
  por índice em `PeerGroupManager.runRounds()` é substituído por agentes escolhendo destinatário).
  Até a fase 7, continuam funcionando como estão — não mexer.
- `LockEntry`/`AuditLog` foram a prova de conceito do `claim()`; o correio copia o formato num
  banco próprio. Convergir os dois é trabalho da fase 7.
- Na fase 7 o `WorkflowCanvas` passa a desenhar aresta por **tráfego real** de mensagem, em vez
  da topologia declarada.
