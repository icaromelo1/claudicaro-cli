# Escritório — comunicação entre sessões/agentes

*Spec de design — 2026-08-02*

## Contexto

Hoje toda comunicação entre agentes é **árvore**: um subagente devolve pro pai, e dois irmãos nunca se falam. O `PeerGroup` do Icarus (spec `2026-07-20-canvas-connection-modes.md`) foi a primeira tentativa de sair disso, mas o `runRounds()` decide quem fala por índice (`members[(round - 1) % members.length]`) e monta o prompt no próprio loop — é um orquestrador, e os agentes não têm agência.

O Escritório é a camada que falta: **sessões e especialistas como pessoas**, endereçáveis por nome, conversando quando querem, sobre vários assuntos ao mesmo tempo, sem chefe obrigatório.

O produto principal é um **servidor MCP standalone** — qualquer sessão Claude Code (terminal, VM Oracle, background agent) entra declarando o MCP. O Icarus vira um cliente/visualizador do mesmo escritório depois, não o dono dele.

### O que já existe e é reaproveitado

- **`LockEntry` + `AuditLog`** (Prisma do Icarus) — o formato do `claim()` já foi pensado e validado aqui: `filesInScope`, `sharedResources`, `intent`, `status` e auditoria de `force_unlock`. O correio é standalone e tem banco próprio, então **copia o formato**, não a tabela; a convergência dos dois fica pra fase 7.
- **`.agent/*.md`** — 16 especialistas (12 DSG + 4 CAST) já escritos e indexados.
- **`claude-workspace-config`** — repo git com symlinks Mac ↔ VM Oracle; é onde o roster e os cadernos moram, ganhando sincronismo de graça.

## Decisões tomadas

| Decisão | Escolha |
|---|---|
| Fronteira | MCP standalone; Icarus herda depois como cliente |
| Consulta | `ask()` síncrono **e** `dm()` assíncrono, ferramentas separadas |
| Memória do colega | Caderno `.md` destilado + sessão viva enquanto a thread está aberta |
| Poderes | Três tiers convivendo (`advisor` / `editor` / `worktree`), declarados por colega |
| Container | **Thread** — substitui salas/canais; debate entre pares é thread com N participantes |

## Arquitetura

### O correio

Servidor MCP `escritorio`, processo próprio, SQLite próprio. Cada sessão declara quem é:

```json
{ "mcpServers": { "escritorio": {
    "command": "node", "args": ["~/escritorio/server.js"],
    "env": { "ESCRITORIO_ID": "icaro-terminal" } } } }
```

O correio **roteia e aplica regra de trânsito**. Não decide o que ninguém faz — não é orquestrador.

### Roster

`roster.yaml` no `claude-workspace-config`, ao lado dos `.agent/*.md`:

```yaml
especialista-deposito:
  brief: "Depósito antecipado, fluxo de pagamento e reembolso (DSG/v1)"
  agent_file: dsg/.agent/especialista-deposito.md
  caderno: cadernos/especialista-deposito.md
  tier: advisor
  cwd: ~/projetos/dsg/v1
```

`brief` é a única coisa que `roster()` devolve — uma linha por colega. É como se descobre com quem falar **sem carregar `.md` nenhum**.

### Tiers

| tier | poder | como é imposto |
|---|---|---|
| `advisor` | lê repo, comandos read-only, consulta API | **allowlist** `--allowedTools` (leitura + Bash read-only + tools do escritório). Denylist não serve — ver "Estado" abaixo |
| `editor` | edita no working tree, só sob `claim()` ativo | correio recusa spawn sem claim; `--permission-mode acceptEdits` |
| `worktree` | git worktree próprio, entrega branch/diff | correio cria o worktree e passa como `cwd`; se não conseguir criar, recusa |

Tier é atributo do colega no roster. Um pedido pode **rebaixar** (pedir `advisor` a um `editor`), nunca elevar.

### Thread

Container único de conversa. Substitui salas, canais e o `PeerGroup`.

```
Thread { id, assunto, dono, participantes[], hops, status, createdAt }
Mensagem { id, threadId, de, para, tipo: 'ask'|'dm'|'resposta', conteudo, createdAt }
```

- **Dono é quem abriu**, e só ele fecha. Substitui o chefe.
- **`hops`** decrementa a cada mensagem; zerou, o correio recusa. Substitui o supervisor que vigiava loop.
- **Debate entre pares** = thread com 3 participantes onde cada um escolhe pra quem responder. Sem rodízio por índice.

### Ferramentas MCP

```
roster()                            quem existe, brief, tier
ask(quem, pergunta, thread?)        bloqueia até a resposta
dm(quem, msg, thread?)              entrega e retorna na hora
inbox()                             puxa correspondência pendente
board_read(chave) / board_write(chave, valor)
claim(recurso, intencao) / release(claimId)
```

Seis ferramentas. Sem `post()` e sem salas — broadcast é thread com todo mundo dentro.

### Quadro branco

Chave com escopo: `dsg/v1:decisoes`, `global:quem-esta-fazendo-o-que`. É onde vai o que **não tem destinatário** — decisão tomada, caminho já tentado que não deu certo, quem está mexendo em quê. Custo zero de turno, e a sessão de amanhã lê o que a de hoje decidiu.

## Entrega — como o agente ouve

Duas naturezas, dois mecanismos. Não são alternativas.

### Sessão viva → hook

Hooks aceitam `hookSpecificOutput.additionalContext` (verificado na doc oficial). O hook é um script shell: roda **fora do modelo**, custo zero de token. Só quando há carta é que o modelo é acionado.

- **`Stop`** — ao fim do turno, consulta o SQLite. Tendo carta: `decision: "block"` + `additionalContext` com as mensagens. A sessão não para, lê e age antes de devolver o controle.
- **`PostToolBatch`** — entrega no meio do trabalho, sem esperar o fim do turno. Só injeta `additionalContext`, não bloqueia.

Ambos filtram por `ESCRITORIO_ID`. Sem carta, o hook sai com exit 0 e saída vazia — invisível.

### Colega headless → acordado pelo correio

```bash
claude -p "<mensagem>" \
  --append-system-prompt "$(cat <agent_file>; cat <caderno>)" \
  --permission-mode <por tier> --disallowedTools <por tier> \
  --mcp-config <escritorio> --output-format json
```

`cwd` vem do roster. O `session_id` do JSON de retorno é guardado pra `--resume` nos turnos seguintes da mesma thread.

## Ciclo de vida do colega

1. **Primeira mensagem da thread** → sessão nova, system prompt = `.agent/*.md` + caderno.
2. **Mensagens seguintes na mesma thread** → `claude -p --resume <session_id>`. Ele lembra da conversa inteira.
3. **Thread fecha** → o correio pede uma última vez: *"o que dessa conversa vale guardar no seu caderno?"* Ele responde com o delta, o correio anexa ao `.md`, a sessão morre.

Memória de longo prazo é o caderno (destilado, auditável, versionado). Memória de curto prazo é a sessão viva. Igual a gente: hoje você lembra da conversa; amanhã, da conclusão.

### Caderno

Markdown simples, escrito pelo próprio colega, editável à mão:

```markdown
# Caderno — especialista-deposito

## Fatos do domínio
- Período é gravado NUMÉRICO ('1'/'2'/'3'), comparar com parseInt + EnumPeriodo.

## Consultas anteriores
- 2026-08-01 (icaro-terminal): valor por cliente ignorado — filtro usa idPrestador contra ids de procedimento.
```

Sem transcrição. Se crescer demais, o próprio colega compacta na próxima destilação.

## Erro e abuso

| Situação | Resposta do correio |
|---|---|
| Colega inexistente | erro com sugestão do `roster()` mais próximo |
| `hops` esgotado | mensagem recusada, thread marcada `exhausted`, dono notificado |
| `ask()` sem resposta em 5 min | devolve timeout; a thread continua viva, a resposta chega por `inbox()` |
| Colega `advisor` tentando editar | bloqueado pelo `--disallowedTools`; tentativa vai pro `AuditLog` |
| `editor` sem `claim` | correio recusa o spawn |
| Dois `claim` no mesmo recurso | segundo recebe o `intent` e o dono do primeiro, e decide esperar ou falar com ele |
| Correio fora do ar | hook falha silencioso (exit 0); tools de MCP erram normal. Nenhuma sessão trava |

## Testes

- **Puro:** decremento de `hops`, resolução de tier (pedido rebaixa mas não eleva), montagem do system prompt (agent_file + caderno), escopo de chave do quadro.
- **Integração (SQLite):** entrega em `inbox()`, `ask()` bloqueando até a resposta, `claim` concorrente, fechamento de thread disparando a destilação.
- **Hook:** dado um inbox com/sem carta, o script emite o JSON certo (com `decision: block` no `Stop`, sem bloqueio no `PostToolBatch`).
- **E2E:** duas sessões headless reais, uma faz `ask()` na outra, valida resposta e o caderno escrito no fim.

## Decomposição para implementação

Implementação em repo próprio (`pessoal/escritorio/`, no workspace do SSD). Este spec mora no repo do Icarus porque o Icarus é o consumidor da fase 7 e é onde a série de specs de canvas/pares já vive.

1. **Correio base** — projeto Node standalone, schema SQLite (Thread, Mensagem, Board, Claim, Colega), sem MCP ainda.
2. **Roster + tiers** — parser do `roster.yaml`, resolução de tier → flags do CLI. Puro, testável isolado.
3. **Servidor MCP** — as seis tools sobre o correio base.
4. **Spawn de colega** — invocação headless, captura de `session_id`, `--resume` por thread.
5. **Hook de entrega** — script shell + entrada no `settings.json` (`Stop` e `PostToolBatch`).
6. **Ciclo do caderno** — destilação no fecho da thread.
7. **Icarus como cliente** — cards do canvas entram como participantes; arestas passam a ser desenhadas pelo tráfego real, não pela topologia declarada. `PeerGroup` vira caso particular de thread.

Fases 1–2 são pré-requisito de tudo. 3–4 são o núcleo utilizável. 5 é o que torna assíncrono real. 6 é o que separa colega de subagente. 7 é o Icarus herdando.

## Estado: fases 1–6 implementadas (2026-08-02)

Repo `pessoal/escritorio/`, 103 testes verdes, instalado e verificado em sessão real
(hook entregando, MCP respondendo, colega acordado com `claude -p`, caderno destilado).

O que a implementação mudou em relação a este desenho:

- **Registro do MCP.** `settings.json` **não** registra servidor MCP no Claude Code — quem faz
  isso é `claude mcp add --scope user` (grava em `~/.claude.json`). O `mcpServers` que este spec
  sugeria no `.mcp.json` só vale para escopo de projeto. O instalador faz os dois caminhos certos.
- **Identidade sem configuração.** Uma sessão interativa comum não tem `ESCRITORIO_ID` no env, e
  exigir configuração por sessão matava a usabilidade. Agora a identidade cai para
  `usuário@pasta` — estável por projeto e endereçável por outra sessão.
- **Responder um `ask` como sessão viva.** Faltava no desenho: `dm` na thread de uma pergunta
  pendente é promovido a `resposta` e destrava quem estava bloqueado. Sem isso, `ask` numa sessão
  viva sempre estourava o timeout.
- **`board_read` com `*`** faz listagem por prefixo, evitando uma sétima tool só pra isso.
- **Expansão de `${VAR}` nos caminhos do roster**, para o mesmo arquivo servir Mac e VM.
- **`fechar_thread` virou tool própria** (o desenho tinha 6 tools; são 7 na prática).

### O tier `advisor` do desenho não segurava nada (corrigido em 03/08)

O caminho de escrita foi testado com `claude` real depois, e o `advisor` **escreveu o arquivo**:
`--disallowedTools Edit Write NotebookEdit` deixa o buraco do `Bash` (`echo x > arquivo`), e
`bypassPermissions` — que o desenho usava para evitar prompt em headless — ignora a negação.

Medido nas quatro variantes: só segurou negando `Bash` junto, ou usando **allowlist**. Ficou a
allowlist (`--allowedTools` com leitura, Bash read-only e as tools do escritório), porque erra pro
lado seguro: o que não for listado fica negado. O advisor continua útil — lê `git log` normalmente.

Na mesma passada, `resolverCwd` do tier `worktree` caía silenciosamente no working tree real
quando não conseguia criar o worktree — exatamente o oposto do que o tier existe pra garantir.
Agora recusa.

Os três tiers têm E2E real (`scripts/smoke-escrita.mjs`) e 10 testes de worktree com repo git
temporário. Total: 117 testes.

Falta a fase 7 (Icarus como cliente).

## Fora de escopo (YAGNI, v1)

- Salas/canais nomeados — thread cobre.
- Colega em máquina remota (VM falando com correio do Mac) — v1 é um correio por máquina; a ponte é problema separado.
- UI própria do correio — o Icarus já é a UI, na fase 7.
- Migrar o `PeerGroup` existente do Icarus — continua funcionando como está até a fase 7.
