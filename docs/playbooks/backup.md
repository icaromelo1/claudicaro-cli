# Playbook: Backup do Banco de Dados

## Quando executar

- Antes de qualquer atualização do aplicativo
- Antes de operações de manutenção no banco de dados
- Periodicamente (recomendado: ao menos uma vez por semana)
- Antes de experimentos ou mudanças estruturais nas sessões

## Como executar

### Via IPC no app

No painel de configurações do Icarus Code, acesse **Configurações > Banco de Dados > Fazer Backup**. O app envia um evento IPC para o processo main, que executa o backup e retorna o caminho do arquivo gerado.

### Via script standalone

```bash
npx ts-node scripts/backup.ts
```

O script copia o arquivo SQLite atual para `prisma/backups/` com timestamp no nome:

```
prisma/backups/icarus-2026-05-12T15-30-00.db
```

## Verificacao

Após o backup, confirme que o arquivo foi criado:

```bash
ls -lh prisma/backups/
```

Para verificar integridade do arquivo de backup:

```bash
sqlite3 prisma/backups/<arquivo>.db "PRAGMA integrity_check;"
```

O retorno deve ser `ok`.

## Restauracao

1. Feche o Icarus Code completamente
2. Localize o arquivo de backup desejado em `prisma/backups/`
3. Copie o arquivo de volta para `prisma/`:

```bash
cp prisma/backups/icarus-<timestamp>.db prisma/icarus.db
```

4. Reinicie o Icarus Code

## Retencao

O sistema mantém automaticamente os **5 backups mais recentes**. Backups mais antigos são removidos automaticamente ao criar um novo backup. Para manter mais backups, ajuste a variável `BACKUP_RETENTION_COUNT` no script `scripts/backup.ts`.
