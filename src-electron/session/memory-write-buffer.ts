import fs from 'fs'
import path from 'path'
import { prisma } from '../../src/db/client.js'

interface WriteTask {
  content: string
  sessionId: string
  resolve: () => void
  reject: (err: unknown) => void
}

export class MemoryWriteBuffer {
  private readonly queues = new Map<string, WriteTask[]>()
  private readonly running = new Set<string>()

  async write(key: string, content: string, sessionId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const task: WriteTask = { content, sessionId, resolve, reject }

      if (!this.queues.has(key)) {
        this.queues.set(key, [])
      }

      this.queues.get(key)!.push(task)
      this.drainQueue(key)
    })
  }

  isPending(key: string): boolean {
    return this.running.has(key) || ((this.queues.get(key)?.length ?? 0) > 0)
  }

  private drainQueue(key: string): void {
    if (this.running.has(key)) return

    const queue = this.queues.get(key)
    if (!queue || queue.length === 0) return

    const task = queue.shift()!
    this.running.add(key)

    this.executeWrite(key, task)
      .then(() => {
        task.resolve()
      })
      .catch((err) => {
        task.reject(err)
      })
      .finally(() => {
        this.running.delete(key)
        this.drainQueue(key)
      })
  }

  private async executeWrite(key: string, task: WriteTask): Promise<void> {
    const finalPath = key
    const tmpPath = `${key}.tmp`

    // Ensure the parent directory exists
    const dir = path.dirname(finalPath)
    await fs.promises.mkdir(dir, { recursive: true })

    // Write to temp file
    await fs.promises.writeFile(tmpPath, task.content, 'utf8')

    // fsync to flush to disk
    const fd = await fs.promises.open(tmpPath, 'r+')
    try {
      await fd.sync()
    } finally {
      await fd.close()
    }

    // Atomic rename
    await fs.promises.rename(tmpPath, finalPath)

    // Persist to Memory table (upsert by sessionId + key)
    await prisma.memory.upsert({
      where: {
        // SQLite doesn't support compound unique by default via generated key,
        // so we query first and then create/update manually
        id: await this.resolveMemoryId(key, task.sessionId)
      },
      update: {
        content: task.content,
        rev: Date.now().toString()
      },
      create: {
        sessionId: task.sessionId,
        key,
        content: task.content,
        rev: Date.now().toString()
      }
    })
  }

  private async resolveMemoryId(key: string, sessionId: string): Promise<string> {
    const existing = await prisma.memory.findFirst({
      where: { key, sessionId },
      select: { id: true }
    })
    // Return existing id or a non-existent sentinel so upsert falls through to create
    return existing?.id ?? '__nonexistent__'
  }
}
