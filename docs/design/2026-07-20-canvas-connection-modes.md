# Modos de conexão entre cards do Canvas

*Spec de design — 2026-07-20*

## Contexto

O Terminal Canvas Workflow (spec `2026-07-20-terminal-canvas-workflow.md`, já implementado) só tem um jeito de um card se relacionar com outro: link cria um card filho que herda contexto (resume nativo ou scrollback como prefixo). O Icaro quer três formas distintas de conexão, cobrindo três casos de uso reais:

1. **Continuar conversa** — o que já existe hoje (PTY interativo, herda contexto do pai).
2. **Executar e sumir** — spawnar um agente pra uma tarefa pontual, sem herdar nada, que desaparece sozinho quando termina.
3. **Conversa entre pares** — múltiplos agentes (ex.: 2-3 Claude Opus) conversando entre si em loop, sem input humano a cada turno, pra convergir numa resposta mais precisa (ex.: gerar um plano).

Achado técnico central: o modo 2 e o modo 3 **não devem usar PTY** — um terminal interativo produz bytes ANSI/chrome de TUI sem fronteira clara de turno, o que torna inviável repassar a saída de um pro outro de forma limpa. Os dois reaproveitam o motor **headless** que os `adapters/` (`ClaudeAdapter`, `GeminiAdapter`, etc.) já usam pro chat normal — texto limpo entrando, texto limpo saindo, turno definido pela Promise resolver.

## Três tipos de card (engine por baixo)

| Tipo | Engine | Termina quando |
|---|---|---|
| **Terminal** (já existe) | PTY interativo (`PtyManager`) | Fechado manualmente |
| **Tarefa** (novo) | Headless, uma chamada (`adapters/`) | Sozinho, quando a resposta termina |
| **Par** (novo) | Headless, loop alternado dentro de um `PeerGroup` | Rodadas máximas ou parada manual |

`CanvasCard` ganha um campo `engine: 'pty' | 'headless-task' | 'headless-peer'` pra distinguir qual motor/UI usar por card.

## Card "Tarefa" (efêmero)

Criado via toolbar (segunda opção, ao lado de "Terminal"): escolhe CLI, digita a tarefa numa caixa, dispara `adapter.invoke()` (mesmo mecanismo do chat, com streaming via `onToken`). O card mostra a resposta indo montando, igual ao chat. Ao terminar: badge "✓ concluído", e o card se remove sozinho (do canvas e do banco) 8 segundos depois — ou imediatamente se o usuário clicar pra fechar antes.

## `PeerGroup` (conversa entre pares)

```prisma
model PeerGroup {
  id           String   @id @default(cuid())
  sessionId    String
  session      Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  turnOrder    String   @default("roundtable") // "round-robin" | "roundtable" — trocável a qualquer momento
  maxRounds    Int      @default(5)
  currentRound Int      @default(0)
  status       String   @default("running")    // "running" | "stopped" | "done"
  createdAt    DateTime @default(now())
  members      PeerGroupMember[]
}

model PeerGroupMember {
  id        String    @id @default(cuid())
  groupId   String
  group     PeerGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  cardId    String    // aponta pro CanvasCard (cli/posição já vivem lá)
  turnIndex Int       // ordem no round-robin
}

model PeerTurn {
  id        String   @id @default(cuid())
  groupId   String
  cardId    String   // quem falou
  round     Int
  content   String
  createdAt DateTime @default(now())
}
```

**Mecânica de uma rodada:**
- **Round-robin:** prompt do próximo membro = só o `content` do `PeerTurn` anterior (do membro que acabou de falar).
- **Mesa-redonda:** prompt do próximo membro = todos os `PeerTurn` da rodada anterior, concatenados e rotulados (`[Opus-1]: ...`, `[Opus-2]: ...`).
- Cada turno é uma chamada `adapter.invoke()` normal. O card daquele membro mostra os turnos dele como uma mini-thread (reaproveita o visual de `ChatMessage.vue`, não é terminal raw).
- O usuário digita o prompt de abertura no momento da criação do grupo. Esse prompt vai só pro membro de `turnIndex: 0` — é a rodada 1. A resposta dele vira o prompt do próximo (round-robin) ou o único "turno anterior" disponível (mesa-redonda, já que ainda não há mais ninguém pra concatenar) — a partir da rodada 2 a mesa-redonda passa a valer com todos os turnos da rodada anterior. O grupo entra em `status: running` e avança sozinho até `currentRound === maxRounds` (`status: done`) ou parada manual (`status: stopped`). Em ambos os casos os cards **ficam abertos** com a transcrição completa — diferente do card "Tarefa", que some.
- `turnOrder` pode ser trocado a qualquer momento durante a conversa (afeta só as rodadas seguintes).

**Criação:** opção própria na toolbar ("Grupo de pares"), separada de "Terminal"/"Tarefa". Adiciona 2+ membros (CLI de cada um), escolhe `turnOrder` e `maxRounds`, digita o prompt de abertura — os N cards nascem juntos, com uma marcação visual (contorno/fundo sutil comum aos membros) diferente da linha tracejada de link pai→filho.

**Fora de escopo (YAGNI, v1):** converter cards Terminal/Tarefa já existentes em membros de um grupo de pares depois de criados — grupo de pares só nasce do zero via toolbar.

## Testes

- Lógica de montagem de prompt por rodada (round-robin vs mesa-redonda): função pura, testável isolada — mesmo padrão de `handoff.ts`.
- Ciclo de vida do card Tarefa (cria → invoke → remove): mockar o adapter, validar que o card é removido do `CanvasManager` após a resolução.
- `PeerGroup`: teste de progressão de rodada (mock de 2-3 adapters respondendo, valida que `currentRound` avança e `status` vira `done` no limite).

## Decomposição para implementação

1. Prisma: `CanvasCard.engine`, models `PeerGroup`/`PeerGroupMember`/`PeerTurn` — migration via CLI
2. Lógica pura de montagem de prompt por rodada (`src-electron/canvas/peer-rounds.ts`) + teste
3. `PeerGroupManager` (orquestra as chamadas `adapter.invoke()` em loop, grava `PeerTurn`) + teste com mocks
4. Card "Tarefa": IPC (`canvas:card:create-task`) + lógica de auto-remove
5. IPC de `PeerGroup` (criar grupo, avançar rodada, parar)
6. UI: toolbar ganha "Tarefa" e "Grupo de pares" ao lado de "Terminal"; novo componente `PeerCard.vue` (thread, não terminal); estilo visual de agrupamento no `WorkflowCanvas.vue`
