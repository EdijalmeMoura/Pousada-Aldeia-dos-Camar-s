import { loadEnv } from 'vite'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { validateDeployment } from './deployment-check.mjs'

const env = loadEnv('production', process.cwd(), 'VITE_')
const problems = validateDeployment(env)
if (problems.length) {
  console.error('Build de produção bloqueado:\n' + problems.map(x => `- ${x}`).join('\n'))
  process.exit(1)
}
const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: { ...process.env, ...env } })
if (result.error || result.status !== 0) process.exit(result.status || 1)
if (!existsSync('dist/index.html') || !existsSync('dist/.htaccess')) {
  console.error('Build incompleto: verifique index.html e .htaccess em dist/.')
  process.exit(1)
}
console.log('Build de produção gerado em dist/. Confirme migrações e funções no Supabase antes de publicar.')
