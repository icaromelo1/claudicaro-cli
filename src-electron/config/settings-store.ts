import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export interface CliSettings {
  enabled: boolean
  binaryPath: string
  defaultModel: string
  defaultBypass: boolean
}

export interface AppSettings {
  clis: {
    claude: CliSettings
    gemini: CliSettings
    copilot: CliSettings
  }
  tokenBudget: number
  defaultOrchestrator: {
    cli: string
    model: string
    agentFile: string | null
    permissionMode: 'bypass' | 'normal' | 'ask'
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  clis: {
    claude: { enabled: true, binaryPath: 'claude', defaultModel: 'claude-sonnet-4-6', defaultBypass: true },
    gemini: { enabled: true, binaryPath: 'gemini', defaultModel: 'gemini-2.5-flash', defaultBypass: true },
    copilot: { enabled: true, binaryPath: 'gh', defaultModel: '', defaultBypass: false },
  },
  tokenBudget: 100000,
  defaultOrchestrator: {
    cli: 'claude',
    model: 'claude-sonnet-4-6',
    agentFile: null,
    permissionMode: 'bypass',
  },
}

export class SettingsStore {
  private settingsPath: string

  constructor() {
    const configDir = path.resolve(currentDir, '../../config')
    this.settingsPath = path.join(configDir, 'settings.json')
  }

  async load(): Promise<AppSettings> {
    try {
      const raw = await readFile(this.settingsPath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return this.merge(parsed)
    } catch {
      const settings = { ...DEFAULT_SETTINGS }
      await this.save(settings)
      return settings
    }
  }

  async save(settings: AppSettings): Promise<void> {
    const dir = path.dirname(this.settingsPath)
    await mkdir(dir, { recursive: true })
    await writeFile(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  }

  async get(): Promise<AppSettings> {
    return this.load()
  }

  async update(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.load()
    const updated: AppSettings = {
      ...current,
      ...partial,
      clis: {
        ...current.clis,
        ...(partial.clis ?? {}),
      },
      defaultOrchestrator: {
        ...current.defaultOrchestrator,
        ...(partial.defaultOrchestrator ?? {}),
      },
    }
    await this.save(updated)
    return updated
  }

  private merge(partial: Partial<AppSettings>): AppSettings {
    return {
      ...DEFAULT_SETTINGS,
      ...partial,
      clis: {
        claude: { ...DEFAULT_SETTINGS.clis.claude, ...(partial.clis?.claude ?? {}) },
        gemini: { ...DEFAULT_SETTINGS.clis.gemini, ...(partial.clis?.gemini ?? {}) },
        copilot: { ...DEFAULT_SETTINGS.clis.copilot, ...(partial.clis?.copilot ?? {}) },
      },
      defaultOrchestrator: {
        ...DEFAULT_SETTINGS.defaultOrchestrator,
        ...(partial.defaultOrchestrator ?? {}),
      },
    }
  }
}

export const settingsStore = new SettingsStore()
