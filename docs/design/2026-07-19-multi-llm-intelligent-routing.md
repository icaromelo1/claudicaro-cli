# Multi-LLM Intelligent Routing — detecção de assinatura + capability matrix por modelo

*Spec de design — 2026-07-19*

## Contexto

O `claudicaro-cli` orquestra Claude Code, Gemini e Copilot hoje. O ecossistema do Icaro ganhou dois CLIs novos — **Agy** (multi-modelo próprio: Gemini 3.5/3.1, Claude Sonnet/Opus, GPT-OSS 120B) e **Codex** (OpenAI) — e a pergunta inicial ("adicionar 2 adapters") evoluiu, ao longo do brainstorming, pra um objetivo mais específico: **roteamento automático que considera qual assinatura tem folga de quota**, sem exigir que o usuário informe isso manualmente toda vez.

Assinaturas reais confirmadas nesta sessão: **Claude Pro** (quota mais apertada, é o motor principal) e **Agy pago** (mais folga, dá acesso aos mesmos modelos Sonnet/Opus por uma via de quota diferente). Codex está em **plano free** (confirmado via decodificação de JWT local) — baixa prioridade até virar assinatura paga. Copilot e Gemini não são o foco econômico agora.

Este spec cobre dois sistemas irmãos, que compartilham o mesmo mecanismo de detecção mas têm implementações separadas (não há runtime compartilhado entre eles):
- **`claudicaro-cli`** (Electron/TS) — router do chat.
- **Ambiente Claude Code deste Mac** (`~/.claude/skills/dispatch` e `~/.claude/skills/plan-analyzer`) — roteamento de tasks avulsas e de waves de plano.

## Pesquisa de viabilidade (já validada, não é suposição)

Testado por leitura direta de arquivos locais, sem rede:

| CLI | Fonte local | Sinal obtido |
|---|---|---|
| Claude Code | Keychain macOS (`security find-generic-password -s "Claude Code-credentials" -w`) → campo `claudeAiOauth` | `subscriptionType: "pro"`, `rateLimitTier: "default_claude_ai"` — **plaintext, alta confiança** |
| Codex | `~/.codex/auth.json` → `tokens.access_token` (JWT) → claim `https://api.openai.com/auth` | `chatgpt_plan_type: "free"` — **alta confiança**, decodificação de JWT local |
| Agy / Antigravity | `~/.gemini/antigravity-cli/cache/onboarding.json` | `enterpriseOnboardingComplete: false` — **sinal fraco** (só distingue pessoal vs enterprise, não dá quota) |
| Gemini | `~/.gemini/oauth_creds.json` (JWT do `id_token`) | Só claims de identidade (email/nome) — **sem sinal de tier** |
| Copilot | Nenhum arquivo local com essa informação | **Sem detecção local** — precisaria de `gh api` (chamada de rede), fora de escopo agora |

Busca ampla por `quota|plan_type|tier|subscription|credits|entitlement|billing` em todos os diretórios do Antigravity (`~/.gemini/antigravity*`) não encontrou nada além do sinal fraco acima — confirmado, não é limitação da busca.

## Arquitetura

Sem lib compartilhada entre `claudicaro-cli` (Electron/Node) e as skills deste ambiente (markdown + Bash, sem runtime próprio) — forçar isso seria abstração sem consumidor real. Mesma estratégia de detecção, duas implementações pequenas:

- **`claudicaro-cli`**: módulo TS `src-electron/subscriptions/detect.ts`, chamado pelo dispatcher.
- **Ambiente Claude Code**: script standalone (`~/.claude/skills/dispatch/scripts/detect-subscriptions.sh` ou `.mjs`), invocado via `Bash` pelas skills `/dispatch` e `/plan-analyzer`.

## Detecção de assinatura

Função (mesma assinatura conceitual nas duas implementações):

```
detectSubscriptions() → [
  { cli: "claude",  planTier: "pro",      confidence: "high", source: "keychain" },
  { cli: "codex",   planTier: "free",     confidence: "high", source: "jwt:~/.codex/auth.json" },
  { cli: "agy",     planTier: "consumer", confidence: "low",  source: "onboarding.json" },
  { cli: "gemini",  planTier: "unknown",  confidence: "none" },
  { cli: "copilot", planTier: "unknown",  confidence: "none" },
]
```

**Regras não-negociáveis:**
- 100% local, zero chamada de rede.
- Nunca logar, imprimir ou persistir o token/credencial em si — só o campo de tier extraído sai da função.
- Cache com TTL (checagem uma vez por sessão/dia) — reconsultar o Keychain a cada request é desnecessário e pode gerar prompt de permissão repetido no macOS.
- Falha na detecção (arquivo ausente, formato mudou, Keychain bloqueado) → `confidence: "none"`, nunca bloqueia o fluxo — cai no comportamento estático atual.

## Capability matrix por modelo

Novo arquivo `rules/models-capabilities.yaml` no `claudicaro-cli`, granular por modelo (não só por CLI):

```yaml
claude-opus-4-7:
  cli: claude
  strengths: [architecture, adr, strategic_planning]
  planTierNeeded: pro
  model_flag: "--model claude-opus-4-7"

claude-sonnet-4-6:
  cli: claude
  strengths: [code_review, debug, multi_file_edit, complex_feature]
  planTierNeeded: pro

agy:claude-opus-4.6-thinking:
  cli: agy
  strengths: [architecture, adr]
  planTierNeeded: any
  model_flag: '--model "Claude Opus 4.6 (Thinking)"'
  note: "usar quando Claude Pro estiver com rate limit — mesma capacidade, quota separada"

agy:gpt-oss-120b:
  cli: agy
  strengths: [lint_fix, commit_message, summarization]
  model_flag: '--model "GPT-OSS 120B (Medium)"'

codex:gpt-5.6-terra:
  cli: codex
  strengths: [second_opinion, code_review]
  planTierNeeded: paid   # hoje em free — deprioritizado até virar assinatura paga
  model_flag: "-m gpt-5.6-terra"
```

O campo `planTierNeeded` conecta com a detecção: se o tier detectado do CLI candidato for `free` (baixa quota) e existir alternativa pro mesmo `strength`, o candidato é deprioritizado automaticamente — sem hardcode de "não usar Codex".

## Router inteligente — `claudicaro-cli`

`router.ts::route()` deixa de ser mapeamento 1:1 estático (task_type → 1 CLI fixo) e passa a escolher entre candidatos:

1. Classifica a task por keyword (mecanismo atual, sem mudança).
2. Busca todos os modelos da capability matrix cujo `strengths` inclui esse task_type → lista de candidatos.
3. Descarta candidato cujo CLI está com tier `free`/indisponível **se existir alternativa** pro mesmo strength. Tier `unknown` (Gemini, Copilot) **não é descartado** — trata como disponível, é o comportamento atual sem penalidade (ausência de sinal não é evidência de quota ruim).
4. Descarta candidato que falhou por rate-limit recentemente (consulta o `MetricsCollector` já existente, de forma preventiva — não só reativa como o failover atual).
5. Escolhe o primeiro candidato restante, na ordem declarada no yaml.

Toggle em `SettingsStore` (`intelligentRouting: boolean`, default `true`) — desligado, volta ao mapeamento 1:1 de hoje. O failover reativo (`failover.ts`, inalterado) continua como rede de segurança para quando a escolha preventiva falhar mesmo assim.

## Roteamento inteligente — `/dispatch` e `/plan-analyzer`

Achado do brainstorming: quem decide o CLI por task num plano não é o `/plan-executor` (só executa o que já vem anotado `[CLI: ...]`) — é o `/plan-analyzer`, que tem sua **própria tabela de roteamento**, hoje duplicada da tabela do `/dispatch` (mesmo espírito, arquivos diferentes).

Mudanças:
1. Adicionar linhas de Agy e Codex na tabela do `/plan-analyzer` (mesmas já adicionadas ao `/dispatch` em 19/07 — ver `~/.claude/skills/dispatch/SKILL.md` v1.1.0).
2. Antes de montar a tabela de roteamento de um plano, rodar o script de detecção uma vez (barato, cacheado).
3. Critério explícito na skill (julgamento guiado, não algoritmo formal — é uma skill markdown seguida por mim, não código compilado): se o CLI candidato estiver com tier `free`/confiança baixa e a task for `complex`, preferir a alternativa da capability matrix.
4. Falha na detecção → comportamento atual, sem bloquear o plano.

## Segurança

- Detecção 100% local, zero rede, zero log de credencial.
- Cache com TTL evita reconsulta excessiva ao Keychain.
- Falha de detecção nunca bloqueia — degrada pro comportamento estático atual.

## Testes

- `claudicaro-cli`: teste E2E real (mesmo padrão já usado pro `CopilotAdapter`) validando a extração de `subscriptionType`/`chatgpt_plan_type` contra os arquivos reais da máquina — sem mockar o parsing.
- `/dispatch`/`/plan-analyzer`: validação manual com 2-3 planos reais após implementado (são skills markdown, não há suíte automatizada pra elas).

## Decomposição para implementação

Cada item vira um plano próprio via `EnterPlanMode` + `/plan-analyzer`, não uma implementação única:

1. Módulo de detecção (TS no `claudicaro-cli` + script standalone no ambiente Claude Code)
2. `rules/models-capabilities.yaml` real
3. Router candidato+penalidade no `claudicaro-cli` (consome 1+2)
4. Atualização de `/dispatch` e `/plan-analyzer` (consome 1+2, adiciona Agy/Codex + critério de tier)
