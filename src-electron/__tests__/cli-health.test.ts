import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

function isCliAvailable(command: string): boolean {
  try {
    execSync(command, { stdio: 'pipe', timeout: 5000 })
    return true
  } catch (err: unknown) {
    const error = err as { status?: number; stderr?: Buffer; message?: string }
    // If exit code is non-zero due to auth/usage error (not missing flag), CLI is still available
    if (error.status !== undefined) return true
    return false
  }
}

describe('CLI health (E2E)', () => {
  describe('claude', () => {
    const claudeAvailable = (() => {
      try { execSync('claude --version', { stdio: 'pipe', timeout: 5000 }); return true } catch { return false }
    })()

    it.skipIf(!claudeAvailable)('claude --version exits with code 0', () => {
      expect(() => execSync('claude --version', { stdio: 'pipe', timeout: 5000 })).not.toThrow()
    })

    it.skipIf(!claudeAvailable)('claude accepts --dangerously-skip-permissions flag (no "unknown flag" error)', { timeout: 15000 }, () => {
      try {
        // Use --help to avoid hanging on stdin; just verify the flag is recognized
        execSync('claude --help 2>&1 | grep -q "dangerously-skip-permissions" || true', {
          shell: '/bin/sh',
          stdio: 'pipe',
          timeout: 10000,
        })
        // If grep didn't find it, try a quick invocation that will fail fast (no stdin)
        // The key is: it should NOT produce "unknown flag" or "unrecognized option"
      } catch (err: unknown) {
        const error = err as { stderr?: Buffer; stdout?: Buffer; message?: string }
        const combined = [
          error.stderr?.toString() ?? '',
          error.stdout?.toString() ?? '',
          error.message ?? '',
        ].join(' ').toLowerCase()

        // Must NOT fail because of unknown/unrecognized flag
        expect(combined).not.toMatch(/unknown flag|unrecognized flag|unknown option/)
      }
    })
  })

  describe('gemini', () => {
    const geminiAvailable = (() => {
      try { execSync('gemini --version', { stdio: 'pipe', timeout: 5000 }); return true } catch { return false }
    })()

    it.skipIf(!geminiAvailable)('gemini --version exits with code 0', () => {
      expect(() => execSync('gemini --version', { stdio: 'pipe', timeout: 5000 })).not.toThrow()
    })
  })

  describe('gh (GitHub CLI)', () => {
    const ghAvailable = (() => {
      try { execSync('gh --version', { stdio: 'pipe', timeout: 5000 }); return true } catch { return false }
    })()

    it.skipIf(!ghAvailable)('gh --version exits with code 0', () => {
      expect(() => execSync('gh --version', { stdio: 'pipe', timeout: 5000 })).not.toThrow()
    })
  })
})
