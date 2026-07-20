# Rename: claudicaro-cli → icarus-code

## Contexto

O app começou como "Claudicaro" (Claude + Icaro), mas hoje orquestra múltiplos CLIs (Claude, Agy, Codex, Copilot) — não faz mais sentido o nome estar amarrado só ao Claude. Novo nome escolhido: **Icarus Code**, usando a raiz "Icarus" sem carregar peso narrativo do mito (nem voo-como-ambição, nem queda-como-ironia — só a palavra em si).

Rename completo: pasta local, repositório GitHub, e todos os identificadores internos (não só branding visível).

## Identificadores finais

| O que | Antes | Depois |
|---|---|---|
| Pasta/repo local | `claudicaro-cli` | `icarus-code` |
| GitHub repo | `icaroMelo1/claudicaro-cli` | `icaroMelo1/icarus-code` |
| `package.json` name | `claudicaro-cli` | `icarus-code` |
| `package.json` productName | `Claudicaro CLI` | `Icarus Code` |
| Electron `appId` | `com.claudicaro.cli` | `com.icarus.code` |
| Bridge IPC (`window.X`) | `claudicaro` | `icarus` |
| Tipo do bridge | `ClaudicaroBridge` | `IcarusBridge` |
| Arquivo de tipos | `src/types/claudicaro.d.ts` | `src/types/icarus.d.ts` |
| Coluna do banco (`CliSession`) | `claudicaroSessionId` | `icarusSessionId` |
| Arquivo do banco | `prisma/claudicaro.db` | `prisma/icarus.db` |
| String do update-checker (`GITHUB_REPO`) | `icaromelo/claudicaro-cli` (owner já estava errado) | `icaroMelo1/icarus-code` |

## Inventário

55 arquivos referenciam "claudicaro" hoje (fora `node_modules` e o binário `.db`). Categorias:

- **Config/build**: `package.json`, `package-lock.json`, `quasar.config.ts`, `prisma.config.ts`, `.gitignore`
- **Schema/dados**: `prisma/schema.prisma`, `prisma/migrations/20260720015432_add_clisession_table/migration.sql`, `prisma/claudicaro.db`
- **Bridge IPC**: `src-electron/electron-preload.ts` (define e expõe `claudicaro`), `src/types/claudicaro.d.ts` (declara `Window.claudicaro`)
- **Consumidores do bridge** (16 arquivos): `useChat.ts`, `useSessions.ts`, e componentes/páginas que chamam `window.claudicaro.*`
- **Consumidores do tipo** (18 arquivos): tudo que importa de `src/types/claudicaro`
- **Backend funcional**: `src-electron/session/session-manager.ts` (usa a coluna `claudicaroSessionId`), `src/db/client.ts`, `src-electron/maintenance/backup.ts`, `src-electron/maintenance/update-checker.ts` (string do repo GitHub, usada de verdade pra checar release)
- **Docs**: `README.md`, `CHECKPOINT.md`, `STATUS.md`, `docs/design/2026-07-19-multi-llm-intelligent-routing.md`, `docs/playbooks/*.md`
- **Diversos**: `rules/rules.yaml`, `src-electron/metrics/index.ts`, `src-electron/security/index.ts`, `src-electron/dispatcher/types.ts` (comentários), `src-electron/sanitize/index.ts`, adapters (`claude.ts`, `copilot.ts`, `agy.ts` — checar se é só nome de variável local ou algo funcional)

## Ordem de execução

1. **Migration do schema primeiro** — gerar via `npx prisma migrate dev --name rename_claudicaro_session_id_to_icarus` (nunca escrever migration à mão), renomeando a coluna `claudicaroSessionId` → `icarusSessionId` na tabela `CliSession`. Validar que os dados existentes (sessões já vinculadas a CLIs) sobrevivem antes de seguir.
2. **Rename mecânico de código** — bridge IPC + tipo + 34 arquivos consumidores, strings de config, textos visíveis na UI e docs. Tasks mecânicas (find & replace de identificador), boas candidatas a `dispatch+review` no plano de implementação.
3. **Renomear o arquivo do banco** — `git mv prisma/claudicaro.db prisma/icarus.db`, só depois da migration aplicada nesse arquivo.
4. **Renomear o repositório no GitHub** (Settings → Rename). GitHub redireciona a URL antiga automaticamente — seguro fazer isso sem quebrar clones existentes.
5. **Renomear a pasta local + atualizar remote** — `mv` da pasta, `git remote set-url origin <nova-url>`. Último passo porque depois disso o caminho absoluto atual deixa de existir.

## Fora de escopo (ajuste avulso posterior, não bloqueia este rename)

- Atualizar referências ao projeto na persona (`claudicaro.md`, repo `claude-workspace-config`) — repo diferente, tratado depois que este rename for confirmado.
- Renomear/mover memórias do Claude Code (`project_claudicaro_cli_status.md` etc.) — mesma lógica.

## Teste

Após o rename completo:
- `npx vue-tsc --noEmit -p .quasar/tsconfig.json` sem erro novo
- `npm run lint` limpo
- `npx vitest run` — suíte real completa, incluindo o teste que persiste uma sessão de verdade (prova que a migration preservou dados)
- `npm run dev` — app sobe com o nome novo na janela/título
- Abrir uma sessão antiga existente e confirmar que carrega (prova que `icarusSessionId` manteve os vínculos de `cliSessionId` por CLI)
- Testar um dispatch real de chat (bridge `window.icarus` funcionando ponta a ponta)
