/** Apenas demonstração local. A autenticação real deve usar Supabase Auth. */
export interface DemoAccount {
  id: string; email: string; nome: string
  salt?: string; hash?: string; password?: string // legado: migrado após login válido
}
const ITERATIONS = 120_000

function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("") }
function hexToBytes(hex: string) { return new Uint8Array(hex.match(/.{2}/g)?.map(b => parseInt(b, 16)) ?? []) }

export async function hashDemoPassword(password: string, salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
  const hash = bytesToHex(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexToBytes(salt), iterations: ITERATIONS, hash: "SHA-256" }, key, 256)))
  return { salt, hash }
}

export async function verifyDemoPassword(account: DemoAccount, password: string) {
  if (account.hash && account.salt) {
    const candidate = (await hashDemoPassword(password, account.salt)).hash
    let diff = candidate.length ^ account.hash.length
    for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ (account.hash.charCodeAt(i) || 0)
    return diff === 0
  }
  return account.password === password // apenas compatibilidade com contas demo anteriores
}
