import { PrismaClient } from '@prisma/client'
import path from 'path'
import { app } from 'electron'

// Em produção usa userData do Electron, em dev usa raiz do projeto
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join(app.getPath('userData'), 'claudicaro.db')
  : path.join(process.cwd(), 'prisma', 'claudicaro.db')

export const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${dbPath}` }
  }
})
