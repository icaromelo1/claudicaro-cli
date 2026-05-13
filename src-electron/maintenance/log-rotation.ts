import fs from 'fs/promises'
import { createReadStream, createWriteStream } from 'fs'
import path from 'path'
import zlib from 'zlib'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = path.resolve(currentDir, '../../..')

const DEFAULT_LOG_DIR = path.join(projectRoot, 'logs')
const DEFAULT_MAX_FILES = 10

function getDateString(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const MM = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd}`
}

export class LogRotation {
  async rotate(logDir?: string, maxFiles?: number): Promise<void> {
    const dir = logDir ?? DEFAULT_LOG_DIR
    const max = maxFiles ?? DEFAULT_MAX_FILES

    await fs.mkdir(dir, { recursive: true })

    let entries: string[]
    try {
      entries = await fs.readdir(dir)
    } catch {
      return
    }

    const logFiles = entries.filter((f) => f.endsWith('.log')).sort()

    if (logFiles.length <= max) {
      return
    }

    const toCompress = logFiles.slice(0, logFiles.length - max)

    await Promise.all(
      toCompress.map(async (filename) => {
        const srcPath = path.join(dir, filename)
        const destPath = path.join(dir, filename + '.gz')

        await pipeline(
          createReadStream(srcPath),
          zlib.createGzip(),
          createWriteStream(destPath),
        )

        await fs.unlink(srcPath)
      }),
    )
  }

  getCurrentLogPath(logDir?: string): string {
    const dir = logDir ?? DEFAULT_LOG_DIR
    return path.join(dir, `app-${getDateString()}.log`)
  }

  async writeLog(message: string, logDir?: string): Promise<void> {
    const dir = logDir ?? DEFAULT_LOG_DIR
    await fs.mkdir(dir, { recursive: true })

    const logPath = this.getCurrentLogPath(dir)
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] ${message}\n`

    await fs.appendFile(logPath, line, 'utf8')
  }
}
