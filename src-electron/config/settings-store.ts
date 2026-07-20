import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { app } from 'electron'

export interface CliSettings {
  enabled: boolean
  binaryPath: string
  defaultModel: string
  defaultBypass: boolean
}

export interface AppSettings {
  clis: {
    claude: CliSettings
    agy: CliSettings
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
    agy: { enabled: true, binaryPath: 'agy', defaultModel: 'Gemini 3.5 Flash (Medium)', defaultBypass: true },
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
  private get settingsPath(): string {
    return path.join(app.getPath('userData'), 'settings.json')
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
    const p = this.settingsPath
    await mkdir(path.dirname(p), { recursive: true })
    await writeFile(p, JSON.stringify(settings, null, 2), 'utf-8')
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
        agy: { ...DEFAULT_SETTINGS.clis.agy, ...(partial.clis?.agy ?? {}) },
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
