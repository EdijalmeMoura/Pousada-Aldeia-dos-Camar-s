import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Inspeciona apenas configuração pública de frontend; nunca pede nem imprime segredos. */
export function validateDeployment(env, root = process.cwd()) {
  const errors = []
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  try {
    const parsed = new URL(url || '')
    if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.') || /<|>|localhost|127\.0\.0\.1/.test(url)) throw new Error('url')
  } catch { errors.push('VITE_SUPABASE_URL: use o endereço HTTPS real do projeto Supabase.') }
  if (!key || key.length < 20 || /<|>|placeholder|service.role/i.test(key)) {
    errors.push('VITE_SUPABASE_ANON_KEY: use apenas a chave pública (anon/publishable) do projeto.')
  }
  for (const name of Object.keys(env)) {
    if (/^VITE_/.test(name) && /(SERVICE_ROLE|SECRET|API_KEY|INFINITEPAY|LOVABLE_API)/i.test(name) && name !== 'VITE_SUPABASE_ANON_KEY') {
      errors.push(`${name}: variável potencialmente privada não pode ser incluída no frontend.`)
    }
  }
  for (let n = 1; n <= 11; n++) {
    const prefix = `${String(n).padStart(3, "0")}_`
    const files = ['001_schema.sql', '002_public_booking.sql', '003_public_quote.sql', '004_manual_payment.sql', '005_infinitepay.sql', '006_payment_safety.sql', '007_calendar_blocks.sql', '008_cancellations.sql', '009_anon_table_grants.sql', '010_tenant_foreign_keys.sql', '011_ai_quota.sql']
    if (!existsSync(resolve(root, 'supabase/migrations', files[n - 1])) || !files[n - 1].startsWith(prefix)) errors.push(`Migração ${prefix} em falta.`)
  }
  if (!existsSync(resolve(root, 'public/.htaccess'))) errors.push('public/.htaccess em falta: rotas diretas podem devolver 404 na Hostinger.')
  return errors
}
