# Terminal Canvas Workflow — canvas infinito de terminais PTY interativos

*Spec de design — 2026-07-20*

## Contexto

O `WorkflowPage.vue` atual usa `WorkflowViewer.vue` (BPMN estático: nodes animados representando o dispatcher, sem interação real). O Icaro pediu uma segunda view, inspirada no Maestri (app de canvas multiagente que ele usa): canvas infinito com cards de terminal arrastáveis, cada um um CLI real rodando em modo **interativo** (não headless), conectados por linhas que representam handoff de contexto entre um card "pai" e um "filho".

Este spec cobre só essa nova view — o `WorkflowViewer.vue` (BPMN) e os `adapters/` headless existentes (usados pelo chat) **não são tocados**. É um subsistema paralelo.

## Arquitetura

```
src-electron/pty/
  pty-manager.ts        — gerencia processos node-pty (create/write/resize/kill/onData)
src-electron/ipc/
  pty-handlers.ts        — canais: pty:create, pty:write, pty:resize, pty:kill (invoke) + pty:data (evento)
src/components/canvas/
  WorkflowCanvas.vue     — canvas infinito: pan/zoom, grid pontilhado, container "world"
  TerminalCard.vue       — 1 card = 1 instância xterm.js ligada a 1 sessão PTY
  CanvasToolbar.vue      — botão "+" (novo terminal, escolhe CLI)
prisma/schema.prisma     — + CanvasCard, CanvasLink
```

Dependências novas: `node-pty` (nativo, precisa `@electron/rebuild -f -w node-pty` — mesmo tratamento já dado ao `better-sqlite3`) e `xterm.js` (renderer, `@xterm/xterm` + `@xterm/addon-fit`).

## Modelo de dados

```prisma
model CanvasCard {
  id        String   @id @default(cuid())
  cli       String              // claude | gemini | agy | codex | copilot
  x         Float
  y         Float
  width     Float    @default(480)
  height    Float    @default(360)
  ptyAlive  Boolean  @default(false)
  createdAt DateTime @default(now())
}

model CanvasLink {
  id             String   @id @default(cuid())
  fromCardId     String
  toCardId       String
  contextSummary String              // o que foi injetado no handoff — auditável
  createdAt      DateTime @default(now())
}
```

`ptyAlive: false` = processo encerrado (app fechado ou usuário matou); o card continua no canvas como registro histórico com posição/link preservados. Reabrir tenta um novo PTY com `--resume`/`--continue` nativo do CLI daquele card, se suportado.

## Ciclo de vida do PTY

```ts
class PtyManager {
  create(cardId: string, cli: string, opts?: { resumeSessionId?: string; initialInput?: string }): void
  write(cardId: string, data: string): void
  resize(cardId: string, cols: number, rows: number): void
  kill(cardId: string): void
  onData(cardId: string, cb: (chunk: string) => void): void
}
```

Spawn **interativo puro** por CLI — sem as flags headless que os adapters usam (`--print`, `-p`, `exec`):
- `claude` (+ `--dangerously-skip-permissions` se bypass já ativo nas Settings; + `--resume <id>` se `opts.resumeSessionId`)
- `gemini` / `agy --model "..."` / `codex` / `copilot` — sessão interativa normal, sem flags de execução única

IPC: `pty:create/write/resize/kill` (invoke) + `pty:data` (evento por `cardId`, streaming de chunks ANSI brutos pro xterm.js).

## Handoff de contexto (criar card filho)

**Mesmo CLI** (ex.: claude → claude): `PtyManager.create()` recebe `resumeSessionId` do card pai, spawna com `--resume`/`--continue` nativo — é a mesma sessão continuando, sem resumo sintético.

**CLI diferente** (ex.: claude → agy): sem resume nativo entre vendors. Captura o **scrollback do xterm.js** do card pai (buffer de texto já mantido pelo terminal) e injeta como `opts.initialInput` no novo PTY — mesmo padrão que `gemini.ts`/`copilot.ts` já usam pra `contextMessages` hoje (prefixo "Contexto da conversa anterior: ..." antes da mensagem atual). Sem chamada de API extra pra resumir.

`CanvasLink.contextSummary` grava o que foi efetivamente injetado (resumeSessionId reusado ou o texto do scrollback), auditável ao reabrir o app.

**Risco conhecido — obter o `resumeSessionId` de uma sessão PTY interativa:** ao contrário do modo headless (que expõe `session_id` em JSON estruturado, como os adapters já fazem), uma sessão PTY interativa só produz texto de terminal puro. Mitigação: fazer scraping de regex nas primeiras linhas do output de cada CLI logo após o spawn (ex.: Claude interativo imprime algo como `Session: <id>` ou equivalente no boot — validar o formato exato na implementação) ou, se o CLI grava a sessão em disco (Codex em `~/.codex/sessions/`, Claude possivelmente em `~/.claude/`), inferir pelo arquivo mais recente criado após o spawn. Se nenhuma das duas funcionar de forma confiável pro CLI em questão, o handoff cai automaticamente pro caminho de scrollback-prefix (mesmo tratamento do caso "CLI diferente") em vez de travar a feature — degrada graciosamente, nunca bloqueia a criação do card filho.

## Interação no canvas

- **Pan:** arrastar o fundo (fora de card) — `transform: translate() scale()` no container "world".
- **Zoom:** scroll + botões +/− no canto, com % visível.
- **Novo card sem link:** botão "+" na toolbar fixa → escolhe CLI → nasce no centro da viewport atual.
- **Novo card filho (com link):** conector na borda de cada card → arrastar até espaço vazio → escolhe CLI do filho → dispara handoff automaticamente, desenha a linha tracejada.
- **Fora de escopo (YAGNI):** linkar dois cards já existentes depois do fato; resize de card (fixo 480×360 por ora).

## Testes

- `PtyManager`: teste real (não mock) spawnando processo simples (`bash`/`cat`) via `node-pty` — valida create/write/data/resize/kill sem depender de CLI pago.
- Lógica de handoff (montar prefixo de contexto, decidir resume vs scrollback): função pura, testável isolada.
- Canvas/xterm.js: sem teste automatizado — mesmo padrão do resto do app, validação manual.

## Decomposição para implementação

1. Deps novas (`node-pty`, `@xterm/xterm`) + rebuild nativo — bloqueia tudo
2. `PtyManager` + canais IPC + teste real com processo simples
3. `CanvasCard`/`CanvasLink` no Prisma (migration via CLI) — paralelo a 2
4. `TerminalCard.vue` (xterm.js ligado a uma sessão PTY)
5. `WorkflowCanvas.vue` (pan/zoom/grid) + `CanvasToolbar.vue`
6. Handoff (resume nativo / scrollback-prefix) plugado no fluxo de criar card filho
7. Nova aba em `WorkflowPage.vue` ao lado do BPMN atual
