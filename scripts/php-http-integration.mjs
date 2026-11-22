import { randomBytes } from 'node:crypto'

export function testEndpoint(raw) {
  const url = new URL(raw)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/')) {
    throw new Error('Indique o URL HTTPS de uma subpasta de testes, terminado em /.')
  }
  if (['localhost', '127.0.0.1'].includes(url.hostname) || url.hostname === 'projetoredesnordeste.com.br' || url.hostname.endsWith('.projetoredesnordeste.com.br')) {
    throw new Error('O domínio de produção está bloqueado. Use um domínio de ensaio isolado.')
  }
  if (!/(?:^|[.-])(test|staging)(?:[.-]|$)/i.test(url.hostname) && !/(?:^|\/)(?:test|staging)(?:\/|$)/i.test(url.pathname)) {
    throw new Error('O domínio ou a subpasta deve identificar explicitamente test ou staging.')
  }
  return url
}

async function run() {
  if (process.env.RUN_PHP_HTTP_INTEGRATION !== 'I_UNDERSTAND_THIS_CREATES_TEST_ACCOUNTS') {
    throw new Error('Bloqueado: defina RUN_PHP_HTTP_INTEGRATION=I_UNDERSTAND_THIS_CREATES_TEST_ACCOUNTS')
  }
  const base = testEndpoint(process.env.HOSPEDAE_TEST_BASE_URL ?? '')
  const origin = base.origin
  const api = new URL('api/index.php', base)
  async function call(action, { params = {}, body, session } = {}) {
    const url = new URL(api)
    url.searchParams.set('action', action)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET', redirect: 'manual', cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'application/json',
        ...(body ? { Origin: origin, 'Content-Type': 'application/json' } : {}),
        ...(session ? { Cookie: session.cookie, ...(body ? { 'X-CSRF-Token': session.csrf } : {}) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (response.status >= 300 && response.status < 400) throw new Error(`Redirecionamento inesperado: ${action}`)
    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('application/json')) throw new Error(`Resposta não-JSON: ${action} (${response.status})`)
    const result = await response.json()
    return { status: response.status, result, cookie: response.headers.get('set-cookie')?.split(';')[0] }
  }
  function check(condition, label) {
    if (!condition) throw new Error(`FALHOU: ${label}`)
    console.log(`OK: ${label}`)
  }
  async function account(label) {
    const session = await call('session')
    check(session.status === 200 && typeof session.result.csrf === 'string' && session.cookie, `sessão ${label}`)
    const client = { csrf: session.result.csrf, cookie: session.cookie }
    const unique = randomBytes(8).toString('hex')
    const email = `hospedae-${unique}@example.invalid`
    const password = randomBytes(24).toString('hex')
    const registered = await call('register', { session: client, body: {
      email, password, nome_pousada: `Pousada de ensaio ${label}`,
    } })
    check(registered.status === 200 && registered.result.account?.pousada_id, `registo ${label}`)
    client.cookie = registered.cookie ?? client.cookie
    client.csrf = registered.result.csrf
    return { ...client, account: registered.result.account, email, password }
  }
  const a = await account('A')
  const b = await account('B')
  check(a.account.pousada_id !== b.account.pousada_id, 'contas distintas')
  async function addRoom(client, name) {
    const response = await call('add-room', { session: client, body: { nome: name, capacidade: 2, preco_base_centavos: 12000 } })
    check(response.status === 200 && /^[0-9a-f]{32}$/i.test(response.result.id), `criar quarto ${name}`)
    return response.result.id
  }
  const renamedSlug = `test-${randomBytes(6).toString('hex')}`
  const renamed = await call('update-pousada', { session: a, body: { nome: 'Pousada de ensaio renomeada', slug: renamedSlug } })
  check(renamed.status === 200 && renamed.result.slug === renamedSlug, 'alterar link público da própria pousada')
  const oldPage = await call('pousada', { params: { slug: a.account.slug } })
  const newPage = await call('pousada', { params: { slug: renamedSlug } })
  check(oldPage.status === 200 && oldPage.result === null && newPage.result?.slug === renamedSlug, 'link antigo deixa de resolver')
  a.account.slug = renamedSlug
  const reserved = await call('update-pousada', { session: b, body: { nome: 'Outra pousada', slug: 'login' } })
  check(reserved.status === 400, 'rota interna reservada rejeitada')
  const duplicate = await call('update-pousada', { session: b, body: { nome: 'Outra pousada', slug: renamedSlug } })
  check(duplicate.status === 409, 'slug de outra pousada rejeitado')
  const roomA = await addRoom(a, 'Quarto A')
  const roomB = await addRoom(b, 'Quarto B')
  const disabled = await call('update-room', { session: a, body: { id: roomA, nome: 'Quarto A', capacidade: 2, preco_base_centavos: 12000, ativo: false } })
  check(disabled.status === 200, 'desativar quarto')
  const hidden = await call('quartos', { params: { slug: a.account.slug } })
  check(hidden.status === 200 && hidden.result.length === 0, 'quarto inativo fora do catálogo')
  const enabled = await call('update-room', { session: a, body: { id: roomA, nome: 'Quarto A', capacidade: 2, preco_base_centavos: 12000, ativo: true } })
  check(enabled.status === 200, 'reativar quarto')
  const roomsA = await call('my-rooms', { session: a })
  check(roomsA.status === 200 && roomsA.result.some(r => r.id.toLowerCase() === roomA) && !roomsA.result.some(r => r.id.toLowerCase() === roomB), 'quartos isolados')
  const start = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
  const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const input = { slug: a.account.slug, quarto_id: roomA, nome_hospede: 'Hóspede de ensaio',
    email: 'hospede@example.invalid', telefone: '81999999999', check_in: start, check_out: end,
    adultos: 2, metodo_pagamento: 'pix', aceito_privacidade: true }
  const wrongTenant = await call('add-booking', { session: b, body: input })
  check(wrongTenant.status === 400, 'quarto de outra pousada rejeitado')
  // Dois pedidos independentes em paralelo exercitam a serialização no servidor.
  const attempts = await Promise.all([call('reservar', { body: input }), call('reservar', { body: input })])
  check(attempts.filter(r => r.status === 200).length === 1 && attempts.filter(r => r.status === 409).length === 1,
    'dois pedidos lançados em paralelo: exatamente uma reserva aceite')
  const tooSmall = await call('update-room', { session: a, body: { id: roomA, nome: 'Quarto A', capacidade: 1, preco_base_centavos: 12000, ativo: true } })
  check(tooSmall.status === 409, 'não reduzir capacidade abaixo de reserva ativa')
  const changedPrice = await call('update-room', { session: a, body: { id: roomA, nome: 'Quarto A', capacidade: 2, preco_base_centavos: 15000, ativo: true } })
  check(changedPrice.status === 200, 'alterar preço futuro')
  const bookingsA = await call('my-bookings', { session: a })
  const bookingsB = await call('my-bookings', { session: b })
  check(bookingsA.status === 200 && bookingsB.status === 200 && bookingsA.result.length === 1 && bookingsB.result.length === 0,
    'reservas privadas isoladas')
  const summaryA = await call('my-summary', { session: a })
  const summaryB = await call('my-summary', { session: b })
  check(summaryA.status === 200 && summaryA.result.pendentes === 1 && summaryA.result.valor_reservado === 240
    && summaryB.status === 200 && summaryB.result.pendentes === 0 && summaryB.result.valor_reservado === 0,
  'resumo operacional isolado e valor reservado não pago')
  const wrongConfirmation = await call('confirm-booking', { session: b, body: { id: bookingsA.result[0].id } })
  check(wrongConfirmation.status === 400, 'outra pousada não confirma a reserva')
  const confirmed = await call('confirm-booking', { session: a, body: { id: bookingsA.result[0].id } })
  check(confirmed.status === 200 && confirmed.result.estado === 'confirmada', 'estadia confirmada sem pagamento')
  const again = await call('confirm-booking', { session: a, body: { id: bookingsA.result[0].id } })
  check(again.status === 409, 'confirmação duplicada rejeitada')
  const summaryConfirmed = await call('my-summary', { session: a })
  check(summaryConfirmed.result.pendentes === 0 && summaryConfirmed.result.confirmadas === 1,
    'resumo atualizado após confirmação')
  const confirmedList = await call('my-bookings', { session: a })
  check(confirmedList.result[0]?.confirmada_em, 'momento de confirmação registado')
  const conflict = await call('add-block', { session: a, body: { quarto_id: roomA, data_inicio: start, data_fim: end, motivo: 'ensaio' } })
  check(conflict.status === 409, 'bloqueio sobre reserva rejeitado')
  const block = await call('add-block', { session: b, body: { quarto_id: roomB, data_inicio: start, data_fim: end, motivo: 'ensaio' } })
  check(block.status === 200, 'bloqueio na outra pousada permitido')
  const otherSession = await call('session')
  const second = { cookie: otherSession.cookie, csrf: otherSession.result.csrf }
  const secondLogin = await call('login', { session: second, body: { email: a.email, password: a.password } })
  check(secondLogin.status === 200, 'segunda sessão da pousada A')
  second.cookie = secondLogin.cookie ?? second.cookie
  second.csrf = secondLogin.result.csrf
  const newPassword = randomBytes(24).toString('hex')
  const change = await call('change-password', { session: a, body: { current_password: a.password, new_password: newPassword } })
  check(change.status === 200 && typeof change.result.csrf === 'string', 'alterar palavra-passe')
  a.cookie = change.cookie ?? a.cookie
  a.csrf = change.result.csrf
  const oldSession = await call('my-rooms', { session: second })
  check(oldSession.status === 401, 'outra sessão revogada')
  const oldPassword = await call('login', { session: second, body: { email: a.email, password: a.password } })
  check(oldPassword.status === 400, 'palavra-passe antiga rejeitada')
  const newLogin = await call('login', { session: second, body: { email: a.email, password: newPassword } })
  check(newLogin.status === 200, 'nova palavra-passe aceite')
  console.log('Ensaio HTTP terminado. As contas e dados de ensaio PERMANECEM na base descartável; apague a base após verificar os resultados.')
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().catch(error => { console.error(error.message); process.exitCode = 1 })
}
