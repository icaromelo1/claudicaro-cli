import { describe, it, expect, afterEach } from 'vitest'
import { PtyManager, CLI_SPECS } from '../src-electron/pty/pty-manager.js'

CLI_SPECS.echotest = { file: 'cat', args: () => [] }

describe('PtyManager (E2E, real PTY via node-pty)', () => {
  let manager: PtyManager

  afterEach(() => {
    manager?.kill('card-1')
  })

  it('spawns a real process and streams data back through onData', async () => {
    manager = new PtyManager()
    const chunks: string[] = []
    manager.onData('card-1', (chunk) => chunks.push(chunk))

    manager.create('card-1', 'echotest')
    expect(manager.isAlive('card-1')).toBe(true)

    manager.write('card-1', 'hello from test\n')

    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(chunks.join('')).toContain('hello from test')
  })

  it('resize does not throw on a live session', () => {
    manager = new PtyManager()
    manager.create('card-1', 'echotest')
    expect(() => manager.resize('card-1', 100, 40)).not.toThrow()
  })

  it('kill removes the session and stops future writes from throwing', async () => {
    manager = new PtyManager()
    manager.create('card-1', 'echotest')
    manager.kill('card-1')

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(manager.isAlive('card-1')).toBe(false)
    expect(() => manager.write('card-1', 'no-op')).not.toThrow()
  })

  it('throws when creating a session for an unknown cli', () => {
    manager = new PtyManager()
    expect(() => manager.create('card-1', 'not-a-real-cli')).toThrow()
  })

  it('writes initialInput automatically on create (handoff)', async () => {
    manager = new PtyManager()
    const chunks: string[] = []
    manager.onData('card-1', (chunk) => chunks.push(chunk))

    manager.create('card-1', 'echotest', { initialInput: 'contexto herdado\n' })

    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(chunks.join('')).toContain('contexto herdado')
  })
})
