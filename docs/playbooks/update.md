# Playbook: Atualizacao do Claudicaro CLI

## Verificar atualizacao disponivel

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

Se houver commits listados, uma atualização está disponível.

Para ver o resumo das mudanças:

```bash
git diff HEAD origin/main --stat
```

## Passos de atualizacao

1. Feche o Claudicaro CLI completamente

2. Faça backup do banco antes de atualizar (ver `backup.md`):

```bash
npx ts-node scripts/backup.ts
```

3. Atualize o repositório:

```bash
git pull origin main
```

4. Instale/atualize as dependências:

```bash
npm install
```

5. Rebuilde o app:

```bash
npm run build
```

6. Reinicie o Claudicaro CLI

## Rollback

Caso a atualização cause problemas:

1. Verifique a versão anterior disponível:

```bash
git log --oneline -10
```

2. Faça checkout da versão anterior pelo hash do commit:

```bash
git checkout <hash-do-commit-anterior>
```

3. Reinstale dependências e rebuilde:

```bash
npm install && npm run build
```

4. Restaure o banco de dados do backup se necessário (ver `backup.md`)

Para voltar à branch principal depois de corrigido o problema:

```bash
git checkout main
```

## Verificacao pos-update

Após a atualização, confirme que o app está funcionando:

1. Abra o Claudicaro CLI e verifique a tela de saúde (`/health`)
2. Execute os testes automatizados:

```bash
npx vitest run
```

3. Verifique a versão exibida no rodapé do app
4. Teste uma conversa simples para confirmar que o dispatcher está operacional
