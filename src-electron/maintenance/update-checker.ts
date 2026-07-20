import https from 'https'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = path.resolve(currentDir, '../../..')

const GITHUB_REPO = 'icaroMelo1/icarus-code'
const CHANGELOG_URL = `https://github.com/${GITHUB_REPO}/blob/main/CHANGELOG.md`

interface GitHubRelease {
  tag_name: string
}

export interface UpdateStatus {
  current: string
  latest: string
  hasUpdate: boolean
}

function parseVersion(v: string): [number, number, number] {
  const clean = v.replace(/^v/, '')
  const parts = clean.split('.').map((p) => parseInt(p, 10) || 0)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

function isNewer(latest: string, current: string): boolean {
  const [lMaj, lMin, lPat] = parseVersion(latest)
  const [cMaj, cMin, cPat] = parseVersion(current)

  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPat > cPat
}

async function getCurrentVersion(): Promise<string> {
  const pkgPath = path.join(projectRoot, 'package.json')
  const raw = await fs.readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(raw) as { version: string }
  return pkg.version
}

function fetchLatestRelease(): Promise<GitHubRelease> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'icarus-code',
        Accept: 'application/vnd.github+json',
      },
    }

    const req = https.get(options, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        try {
          resolve(JSON.parse(body) as GitHubRelease)
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

export class UpdateChecker {
  async checkLatest(): Promise<UpdateStatus> {
    const current = await getCurrentVersion()

    try {
      const release = await fetchLatestRelease()
      const latest = release.tag_name?.replace(/^v/, '') ?? current
      const hasUpdate = isNewer(latest, current)
      return { current, latest, hasUpdate }
    } catch {
      return { current, latest: current, hasUpdate: false }
    }
  }

  getChangelogUrl(): string {
    return CHANGELOG_URL
  }
}
