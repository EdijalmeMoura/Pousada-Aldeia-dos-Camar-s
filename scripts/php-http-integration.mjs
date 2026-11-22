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
    const registered = await call('register', { session: client, body: {
      email: `hospedae-${unique}@example.invalid`, password: randomBytes(24).toString('hex'), nome_pousada: `Pousada de ensaio ${label}`,
    } })
    check(registered.status === 200 && registered.result.account?.pousada_id, `registo ${label}`)
    client.cookie = registered.cookie ?? client.cookie
    client.csrf = registered.result.csrf
    return { ...client, account: registered.result.account }
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
  const bookingsA = await call('my-bookings', { session: a })
  const bookingsB = await call('my-bookings', { session: b })
  check(bookingsA.status === 200 && bookingsB.status === 200 && bookingsA.result.length === 1 && bookingsB.result.length === 0,
    'reservas privadas isoladas')
  const conflict = await call('add-block', { session: a, body: { quarto_id: roomA, data_inicio: start, data_fim: end, motivo: 'ensaio' } })
  check(conflict.status === 409, 'bloqueio sobre reserva rejeitado')
  const block = await call('add-block', { session: b, body: { quarto_id: roomB, data_inicio: start, data_fim: end, motivo: 'ensaio' } })
  check(block.status === 200, 'bloqueio na outra pousada permitido')
  console.log('Ensaio HTTP terminado. As contas e dados de ensaio PERMANECEM na base descartável; apague a base após verificar os resultados.')
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().catch(error => { console.error(error.message); process.exitCode = 1 })
}
