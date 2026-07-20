import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = path.resolve(currentDir, '../../..')

const DEFAULT_DB_PATH = path.join(projectRoot, 'prisma', 'icarus.db')
const DEFAULT_BACKUP_DIR = path.join(projectRoot, 'backups')
const MAX_BACKUPS = 5

function getTimestamp(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const MM = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const HH = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd}-${HH}${mm}${ss}`
}

export class BackupManager {
  async createBackup(destDir?: string): Promise<string> {
    const backupDir = destDir ?? DEFAULT_BACKUP_DIR

    await fs.mkdir(backupDir, { recursive: true })

    const filename = `icarus-${getTimestamp()}.db`
    const destPath = path.join(backupDir, filename)

    await fs.copyFile(DEFAULT_DB_PATH, destPath)

    await this._pruneOldBackups(backupDir)

    return destPath
  }

  async listBackups(destDir?: string): Promise<string[]> {
    const backupDir = destDir ?? DEFAULT_BACKUP_DIR

    let entries: string[]
    try {
      entries = await fs.readdir(backupDir)
    } catch {
      return []
    }

    const dbFiles = entries
      .filter((f) => f.endsWith('.db'))
      .sort()
      .reverse()
      .map((f) => path.join(backupDir, f))

    return dbFiles
  }

  private async _pruneOldBackups(backupDir: string): Promise<void> {
    let entries: string[]
    try {
      entries = await fs.readdir(backupDir)
    } catch {
      return
    }

    const dbFiles = entries.filter((f) => f.endsWith('.db')).sort()

    if (dbFiles.length > MAX_BACKUPS) {
      const toDelete = dbFiles.slice(0, dbFiles.length - MAX_BACKUPS)
      await Promise.all(toDelete.map((f) => fs.unlink(path.join(backupDir, f))))
    }
  }
}
