import { phpRequest } from "./phpBackend"

export interface PhpAccount { id: string; email: string; pousada_id: string; nome_pousada: string; slug: string }
type Session = { account: PhpAccount | null; csrf: string }
let csrf: string | null = null

export async function phpSession(): Promise<PhpAccount | null> {
  const session = await phpRequest<Session>("session")
  csrf = session.csrf
  return session.account
}

export async function phpWrite<T>(action: string, body: Record<string, unknown>): Promise<T> {
  if (!csrf) await phpSession()
  if (!csrf) throw new Error("Sessão indisponível. Atualize a página.")
  const result = await phpRequest<T>(action, {}, body, csrf)
  if (result && typeof result === "object" && "csrf" in result && typeof result.csrf === "string") csrf = result.csrf
  return result
}

export function clearPhpSession() { csrf = null }
