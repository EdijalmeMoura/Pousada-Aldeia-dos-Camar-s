import { supabase, isSupabaseConfigured } from "./supabase"
import { uid, slugify } from "./utils"

/**
 * Camada de dados dual: usa Supabase (Lovable Cloud) quando configurado,
 * caso contrário opera sobre localStorage para demonstração offline.
 * A interface é idêntica — as páginas não distinguem o backend.
 */

export interface Profile {
  id: string; nome: string; email: string; avatar_url: string | null
  plano: string; trial_ends_at: string | null; created_at: string
  nome_pousada: string; slug: string; whatsapp: string; cor: string; logo_url: string
  onboarding_concluido: boolean; regras_casa: string; chave_pix: string; link_pagamento: string
}
export interface Quarto {
  id: string; user_id: string; nome: string; descricao: string; capacidade: number
  preco_base: number; comodidades: string; foto_url: string; ativo: boolean
  codigo: string; created_at: string; updated_at: string
}
export interface Tarifa {
  id: string; user_id: string; quarto_id: string; temporada: string
  data_inicio: string; data_fim: string; preco_noite: number; created_at: string
}
export interface Reserva {
  id: string; user_id: string; quarto_id: string; nome_hospede: string; email: string
  telefone: string; check_in: string; check_out: string; adultos: number
  estado: "pendente" | "confirmada" | "cancelada" | "concluida"
  metodo_pagamento: "pix" | "cartao"; valor_total: number; codigo_reserva: string
  origem: "direta" | "plataforma"; created_at: string; updated_at: string
}
export interface Checkin {
  id: string; user_id: string; reserva_id: string; estado: string
  dados: Record<string, string>; codigo_quarto: string; regras_enviadas: boolean
  created_at: string; updated_at: string
}
export interface Atividade {
  id: string; user_id: string; tipo: string; descricao: string; created_at: string
}

type Table = "profiles" | "quartos" | "tarifas" | "reservas" | "checkins" | "atividades"
const LS = "pousada_db_v1"

function readAll(): Record<Table, any[]> {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  const empty: Record<Table, any[]> = { profiles: [], quartos: [], tarifas: [], reservas: [], checkins: [], atividades: [] }
  localStorage.setItem(LS, JSON.stringify(empty))
  return empty
}
function writeAll(db: Record<Table, any[]>) { localStorage.setItem(LS, JSON.stringify(db)) }

export async function dbList<T>(table: Table, userId?: string): Promise<T[]> {
  if (isSupabaseConfigured && supabase) {
    let q = supabase.from(table).select("*").order("created_at", { ascending: false })
    if (userId) q = q.eq("user_id", userId)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as T[]
  }
  const db = readAll()
  const rows = db[table].filter((r: any) => !userId || r.user_id === userId || r.id === userId)
  return rows as T[]
}

export async function dbInsert<T extends Record<string, any>>(table: Table, row: Omit<T, "created_at" | "updated_at"> & Partial<Pick<T, "created_at" | "updated_at">>): Promise<T> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from(table).insert(row as any).select().single()
    if (error) throw error
    return data as T
  }
  const db = readAll()
  const full = { ...row, id: row.id ?? uid(), created_at: row.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString() }
  db[table].unshift(full)
  writeAll(db)
  return full as unknown as T
}

export async function dbUpdate<T extends Record<string, any>>(table: Table, id: string, patch: Partial<T>): Promise<T> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from(table).update(patch as any).eq("id", id).select().single()
    if (error) throw error
    return data as T
  }
  const db = readAll()
  const i = db[table].findIndex((r: any) => r.id === id)
  if (i < 0) throw new Error("Registo não encontrado")
  db[table][i] = { ...db[table][i], ...patch, updated_at: new Date().toISOString() }
  writeAll(db)
  return db[table][i] as T
}

export async function dbDelete(table: Table, id: string) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from(table).delete().eq("id", id)
    if (error) throw error
    return
  }
  const db = readAll()
  db[table] = db[table].filter((r: any) => r.id !== id)
  writeAll(db)
}

export async function logActivity(userId: string, tipo: string, descricao: string) {
  try { await dbInsert("atividades", { user_id: userId, tipo, descricao }) } catch { /* silencioso */ }
}

export function newProfile(user: { id: string; email: string; nome?: string }): Profile {
  const nome = user.nome ?? user.email.split("@")[0]
  return {
    id: user.id, nome, email: user.email, avatar_url: null, plano: "trial",
    trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    created_at: new Date().toISOString(), nome_pousada: "", slug: slugify(nome) + "-" + user.id.slice(0, 6),
    whatsapp: "", cor: "#0891b2", logo_url: "", chave_pix: "", link_pagamento: "", onboarding_concluido: false,
    regras_casa: "Check-in a partir das 14h. Check-out até às 11h. Proibido fumar nos quartos. Animais de estimação mediante acordo prévio.",
  }
}

export async function getProfileBySlug(slug: string): Promise<Profile | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("profiles").select("*").eq("slug", slug).maybeSingle()
    return data as Profile | null
  }
  const db = readAll()
  return (db.profiles.find((p: any) => p.slug === slug) as Profile) ?? null
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle()
    return data as Profile | null
  }
  const db = readAll()
  return (db.profiles.find((p: any) => p.id === id) as Profile) ?? null
}

export async function saveProfile(p: Profile) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("profiles").upsert(p)
    if (error) throw error
    return p
  }
  const db = readAll()
  const i = db.profiles.findIndex((x: any) => x.id === p.id)
  if (i >= 0) db.profiles[i] = p; else db.profiles.push(p)
  writeAll(db)
  return p
}

/** Dados de demonstração: 3 quartos com fotos, tarifas e reservas */
export async function seedDemo(userId: string) {
  const quartos: Quarto[] = [
    { id: uid(), user_id: userId, nome: "Quarto Maré Alta", descricao: "Vista para o mar, cama king e varanda privativa.", capacidade: 2, preco_base: 320, comodidades: "Wi-Fi, ar-condicionado, pequeno-almoço incluído", foto_url: "/images/quarto-1.jpg", ativo: true, codigo: "4821", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uid(), user_id: userId, nome: "Chalé Serra Verde", descricao: "Aconchegante, com lareira e vista para as colinas.", capacidade: 4, preco_base: 450, comodidades: "Wi-Fi, lareira, cozinha equipada", foto_url: "/images/quarto-2.jpg", ativo: true, codigo: "4822", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: uid(), user_id: userId, nome: "Suíte Piscina", descricao: "Acesso direto à piscina, moderno e luminoso.", capacidade: 3, preco_base: 520, comodidades: "Wi-Fi, piscina privativa, ar-condicionado", foto_url: "/images/quarto-3.jpg", ativo: true, codigo: "4823", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ]
  for (const q of quartos) await dbInsert<Quarto>("quartos", q)
  await dbInsert<Tarifa>("tarifas", { id: uid(), user_id: userId, quarto_id: quartos[0].id, temporada: "Alta estação — dezembro", data_inicio: "2026-12-01", data_fim: "2027-01-15", preco_noite: 420 })
  const hoje = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const reservas: Reserva[] = [
    { id: uid(), user_id: userId, quarto_id: quartos[0].id, nome_hospede: "Mariana Silva", email: "mariana@email.com", telefone: "81987654321", check_in: fmt(hoje), check_out: fmt(new Date(Date.now() + 3 * 864e5)), adultos: 2, estado: "confirmada", metodo_pagamento: "pix", valor_total: 960, codigo_reserva: "ADC-8K2P4Q", origem: "direta", created_at: new Date(Date.now() - 2 * 864e5).toISOString(), updated_at: new Date().toISOString() },
    { id: uid(), user_id: userId, quarto_id: quartos[2].id, nome_hospede: "Carlos Eduardo", email: "carlos@email.com", telefone: "11987654321", check_in: fmt(new Date(Date.now() + 2 * 864e5)), check_out: fmt(new Date(Date.now() + 5 * 864e5)), adultos: 3, estado: "pendente", metodo_pagamento: "cartao", valor_total: 1560, codigo_reserva: "ADC-3M7X9A", origem: "direta", created_at: new Date(Date.now() - 864e5).toISOString(), updated_at: new Date().toISOString() },
    { id: uid(), user_id: userId, quarto_id: quartos[1].id, nome_hospede: "Ana Beatriz", email: "ana@email.com", telefone: "21987654321", check_in: fmt(new Date(Date.now() - 864e5)), check_out: fmt(new Date(Date.now() + 864e5)), adultos: 4, estado: "concluida", metodo_pagamento: "pix", valor_total: 900, codigo_reserva: "ADC-5T1R8W", origem: "plataforma", created_at: new Date(Date.now() - 5 * 864e5).toISOString(), updated_at: new Date().toISOString() },
  ]
  for (const r of reservas) await dbInsert<Reserva>("reservas", r)
  await logActivity(userId, "seed", "Dados de demonstração carregados")
}
