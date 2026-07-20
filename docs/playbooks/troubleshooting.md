# Playbook: Troubleshooting

## CLI nao responde

**Sintomas:** o app abre mas nenhuma mensagem é processada; indicador de loading infinito.

**Passos:**

1. Acesse a health page no app (`/health`) e verifique o status de cada CLI
2. Abra um terminal e verifique se os binários estão no PATH:

```bash
which claude
which gemini
which gh
```

3. Teste manualmente cada CLI:

```bash
claude --version
gemini --version
gh --version
```

4. Se algum binário não for encontrado, reinstale via gerenciador de pacotes correspondente
5. Reinicie o Icarus Code após corrigir o PATH

---

## Banco corrompido

**Sintomas:** erros de Prisma ao carregar sessões, app trava na inicialização, mensagens "database disk image is malformed".

**Passos:**

1. Feche o Icarus Code
2. Verifique a integridade do banco atual:

```bash
sqlite3 prisma/icarus.db "PRAGMA integrity_check;"
```

3. Se retornar algo diferente de `ok`, restaure o backup mais recente:

```bash
ls -lt prisma/backups/
cp prisma/backups/<backup-mais-recente>.db prisma/icarus.db
```

4. Reinicie o app e verifique se as sessões foram recuperadas

---

## Tokens esgotados

**Sintomas:** respostas truncadas, erro "token limit exceeded", budget zerado na sessão.

**Passos:**

1. Na interface do app, verifique o budget da sessão atual no painel de informações
2. Se o budget estiver esgotado, inicie uma nova sessão via `Ctrl+N` ou pelo menu
3. Para tarefas longas, use `forceTaskType: 'complex_feature'` com Claude que tem maior janela de contexto
4. Verifique se o compactador de contexto foi ativado — o histórico muito longo pode ser compactado via `/compact`

---

## App nao abre

**Sintomas:** o processo inicia mas a janela não aparece, ou o app fecha imediatamente.

**Passos:**

1. Verifique os logs de erro do Electron:

```bash
# macOS
cat ~/Library/Logs/Icarus Code/main.log

# Alternativa: diretório logs/ do projeto
ls -lt logs/
cat logs/main.log
```

2. Tente rodar em modo desenvolvimento para ver erros no terminal:

```bash
npm run dev
```

3. Verifique se há outro processo do app já rodando:

```bash
ps aux | grep icarus
```

4. Se houver processo travado, encerre-o:

```bash
pkill -f icarus
```

5. Reinicie o app

---

## Rebuild de dependencias nativas

**Sintomas:** erros como "was compiled against a different Node.js version", módulos nativos não carregam, erros de `NODE_MODULE_VERSION`.

**Passos:**

1. Execute o rebuild das dependências nativas para a versão do Electron atual:

```bash
npx @electron/rebuild
```

2. Se houver módulos específicos com problema (ex.: `better-sqlite3`, `bcrypt`):

```bash
npx @electron/rebuild -f -w <nome-do-modulo>
```

3. Após o rebuild, reinicie o app

4. Se o problema persistir, limpe `node_modules` e reinstale:

```bash
rm -rf node_modules
npm install
npx @electron/rebuild
```
