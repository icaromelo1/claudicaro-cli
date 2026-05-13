import { BackupManager } from '../src-electron/maintenance/backup.js'

async function main(): Promise<void> {
  const manager = new BackupManager()
  const destPath = await manager.createBackup()
  console.log(`Backup criado: ${destPath}`)
}

main().catch((err: unknown) => {
  console.error('Erro ao criar backup:', err)
  process.exit(1)
})
