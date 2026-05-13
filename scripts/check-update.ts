import { UpdateChecker } from '../src-electron/maintenance/update-checker.js'

async function main(): Promise<void> {
  const checker = new UpdateChecker()
  const status = await checker.checkLatest()

  console.log(`Versão atual:  ${status.current}`)
  console.log(`Versão latest: ${status.latest}`)

  if (status.hasUpdate) {
    console.log(`\nAtualização disponível! ${status.current} → ${status.latest}`)
    console.log(`Changelog: ${checker.getChangelogUrl()}`)
  } else {
    console.log('\nAplicação está na versão mais recente.')
  }
}

main().catch((err: unknown) => {
  console.error('Erro ao verificar atualização:', err)
  process.exit(1)
})
