import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { validateDeployment } from './deployment-check.mjs'

const valid = { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_example_public_key_12345' }
test('bloqueia frontend de produção sem Supabase', () => {
  assert.ok(validateDeployment({}).some(x => x.includes('VITE_SUPABASE_URL')))
  assert.ok(validateDeployment({}).some(x => x.includes('VITE_SUPABASE_ANON_KEY')))
})
test('rejeita localhost, placeholders e variáveis de servidor no Vite', () => {
  assert.ok(validateDeployment({ ...valid, VITE_SUPABASE_URL: 'http://localhost:54321' }).length > 0)
  assert.ok(validateDeployment({ ...valid, VITE_INFINITEPAY_API_KEY: 'secret' }).some(x => x.includes('VITE_INFINITEPAY')))
  assert.ok(validateDeployment({ ...valid, VITE_SUPABASE_ANON_KEY: '<anon-key>' }).length > 0)
})
test('aceita apenas configuração pública válida com ficheiros essenciais presentes', () => {
  assert.deepEqual(validateDeployment(valid), [])
})
