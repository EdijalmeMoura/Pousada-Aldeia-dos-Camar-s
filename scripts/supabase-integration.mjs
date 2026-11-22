import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

// Teste destrutivo em contas efémeras: APENAS num projeto de ensaio descartável.
if (process.env.RUN_SUPABASE_INTEGRATION !== 'I_UNDERSTAND_THIS_CREATES_TEST_DATA') {
  console.error('Teste bloqueado. Configure RUN_SUPABASE_INTEGRATION=I_UNDERSTAND_THIS_CREATES_TEST_DATA apenas num projeto de ensaio.')
  process.exit(1)
}
const url = process.env.SUPABASE_TEST_URL
const anonKey = process.env.SUPABASE_TEST_ANON_KEY
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
if (!url?.startsWith('https://') || !anonKey || !serviceKey || anonKey === serviceKey) {
  console.error('Indique SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY e SUPABASE_TEST_SERVICE_ROLE_KEY como variáveis privadas do processo.')
  process.exit(1)
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
const anon = createClient(url, anonKey, { auth: { persistSession: false } })
const users = []
const expect = (condition, reason) => { if (!condition) throw new Error(reason) }
const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10)
const suffix = randomUUID().slice(0, 8)

try {
  for (let i = 0; i < 2; i++) {
    const email = `hospedae-test-${suffix}-${i}@example.invalid`
    const password = `${randomUUID()}Aa1!`
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome: `Teste ${i}` } })
    if (created.error || !created.data.user) throw created.error || new Error('Utilizador não criado')
    const id = created.data.user.id
    users.push(id)
    const slug = `ensaio-${suffix}-${i}`
    const updated = await admin.from('profiles').update({ nome_pousada: `Ensaio ${i}`, slug, onboarding_concluido: true }).eq('id', id).select().single()
    if (updated.error) throw updated.error
    const room = await admin.from('quartos').insert({ user_id: id, nome: `Quarto ensaio ${i}`, preco_base: 100, capacidade: 2, ativo: true }).select('id').single()
    if (room.error) throw room.error
    users[i] = { id, email, password, slug, roomId: room.data.id }
  }
  const [one, two] = users
  const ownerLogin = await createClient(url, anonKey, { auth: { persistSession: false } }).auth.signInWithPassword({ email: one.email, password: one.password })
  if (ownerLogin.error || !ownerLogin.data.session) throw ownerLogin.error || new Error('Login indisponível')
  const owner = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${ownerLogin.data.session.access_token}` } } })
  const otherRooms = await owner.from('quartos').select('id').eq('id', two.roomId)
  expect(!otherRooms.error && otherRooms.data.length === 0, 'RLS permitiu ler quarto alheio')
  const crossTenant = await owner.from('tarifas').insert({ user_id: one.id, quarto_id: two.roomId, temporada: 'inválida', data_inicio: future(10), data_fim: future(11), preco_noite: 1 })
  expect(Boolean(crossTenant.error), 'FK permitiu tarifa cruzada')
  const directProfile = await anon.from('profiles').select('email').eq('slug', one.slug)
  expect(Boolean(directProfile.error), 'Acesso direto anónimo a profiles não foi revogado')
  const publicProfile = await anon.rpc('public_pousada', { p_slug: one.slug })
  expect(!publicProfile.error && publicProfile.data?.length === 1, 'RPC pública da pousada indisponível')
  expect(!('email' in publicProfile.data[0]), 'RPC pública devolveu e-mail privado')
  const publicRooms = await anon.rpc('public_quartos', { p_slug: one.slug })
  expect(!publicRooms.error && publicRooms.data?.length === 1 && !('codigo' in publicRooms.data[0]), 'RPC pública expôs código do quarto')
  const args = { p_slug: one.slug, p_quarto_id: one.roomId, p_nome: 'Hóspede de ensaio', p_email: 'hospede@example.invalid', p_telefone: '81999999999', p_entrada: future(20), p_saida: future(22), p_adultos: 2, p_metodo: 'pix' }
  const withoutConsent = await anon.rpc('criar_reserva_publica_com_consentimento', { ...args, p_aceite: false })
  expect(Boolean(withoutConsent.error), 'Reserva aceite sem declaração de privacidade')
  const quote = await anon.rpc('cotar_reserva_publica', { p_slug: one.slug, p_quarto_id: one.roomId, p_entrada: future(20), p_saida: future(22), p_adultos: 2 })
  expect(!quote.error && Number(quote.data?.valor_total) === 200, 'Cotação incorreta')
  const booked = await anon.rpc('criar_reserva_publica_com_consentimento', { ...args, p_aceite: true })
  expect(!booked.error && booked.data?.codigo_reserva, `Reserva anónima falhou: ${booked.error?.message || ''}`)
  const overlap = await anon.rpc('criar_reserva_publica_com_consentimento', { ...args, p_aceite: true })
  expect(Boolean(overlap.error), 'Permitiu reserva sobreposta')
  const ownerRows = await owner.from('reservas').select('id,codigo_reserva,consentimento_em').eq('codigo_reserva', booked.data.codigo_reserva)
  expect(!ownerRows.error && ownerRows.data?.length === 1 && ownerRows.data[0].consentimento_em, 'Reserva não chegou ao proprietário ou não registou a declaração')
  console.log('Integração Supabase: isolamento, RPC pública, privacidade, cotação e sobreposição aprovados.')
} catch (error) {
  console.error('Falha na integração:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  for (const user of users) {
    const id = typeof user === 'string' ? user : user.id
    // auth.users ON DELETE CASCADE limpa perfis, quartos e reservas efémeras.
    try {
      const removed = await admin.auth.admin.deleteUser(id)
      if (removed.error) console.error('Limpeza pendente para utilizador de ensaio:', id)
    } catch { console.error('Limpeza pendente para utilizador de ensaio:', id) }
    await delay(50)
  }
}
