import { dbInsert, dbList, type Profile, type Quarto, type Reserva, type Tarifa } from "./db"
import { isSupabaseConfigured, supabase } from "./supabase"
import { uid } from "./utils"

export type PublicPousada = Pick<Profile, "id" | "nome_pousada" | "slug" | "cor" | "logo_url">
export type PublicQuarto = Pick<Quarto, "id" | "nome" | "descricao" | "capacidade" | "preco_base" | "comodidades" | "foto_url" | "ativo">
export type BookingInput = Pick<Reserva, "nome_hospede" | "email" | "telefone" | "check_in" | "check_out" | "adultos" | "metodo_pagamento">
export type BookingQuote = { valor_total: number; noites: number }
export type BookingResult = Pick<Reserva, "codigo_reserva" | "valor_total">

export async function publicPousada(slug: string): Promise<PublicPousada | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("public_pousada", { p_slug: slug }).maybeSingle()
    if (error) throw error
    return data as PublicPousada | null
  }
  const { getProfileBySlug } = await import("./db")
  const p = await getProfileBySlug(slug)
  return p?.onboarding_concluido ? p : null
}

export async function publicQuartos(slug: string, ownerId: string): Promise<PublicQuarto[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("public_quartos", { p_slug: slug })
    if (error) throw error
    return data as PublicQuarto[]
  }
  return (await dbList<Quarto>("quartos", ownerId)).filter(q => q.ativo).map(
    ({ id, nome, descricao, capacidade, preco_base, comodidades, foto_url, ativo }) =>
      ({ id, nome, descricao, capacidade, preco_base, comodidades, foto_url, ativo }))
}

export function bookingDates(input: Pick<BookingInput, "check_in" | "check_out" | "adultos">, capacity: number) {
  const start = new Date(`${input.check_in}T12:00:00Z`)
  const end = new Date(`${input.check_out}T12:00:00Z`)
  const today = new Date().toISOString().slice(0, 10)
  const nights = Math.round((end.getTime() - start.getTime()) / 864e5)
  if (!Number.isFinite(nights) || input.check_in < today || nights < 1 || nights > 90) throw new Error("Escolha datas futuras válidas (até 90 noites).")
  if (input.adultos < 1 || input.adultos > capacity) throw new Error("O número de hóspedes excede a capacidade do quarto.")
  return nights
}

export async function quotePublicBooking(slug: string, ownerId: string, room: PublicQuarto, input: Pick<BookingInput, "check_in" | "check_out" | "adultos">): Promise<BookingQuote> {
  const nights = bookingDates(input, room.capacidade)
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("cotar_reserva_publica", {
      p_slug: slug, p_quarto_id: room.id, p_entrada: input.check_in,
      p_saida: input.check_out, p_adultos: input.adultos,
    })
    if (error) throw error
    return data as BookingQuote
  }
  const reservas = await dbList<Reserva>("reservas", ownerId)
  if (reservas.some(r => r.quarto_id === room.id && ["pendente", "confirmada"].includes(r.estado) && r.check_in < input.check_out && r.check_out > input.check_in)) {
    throw new Error("Este quarto já está reservado nessas datas.")
  }
  const tarifas = await dbList<Tarifa>("tarifas", ownerId)
  let total = 0
  for (let i = 0; i < nights; i++) {
    const date = new Date(Date.parse(`${input.check_in}T12:00:00Z`) + i * 864e5).toISOString().slice(0, 10)
    const tarifa = tarifas.filter(t => t.quarto_id === room.id && date >= t.data_inicio && date <= t.data_fim).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    total += tarifa?.preco_noite ?? room.preco_base
  }
  return { valor_total: total, noites: nights }
}

export async function createPublicBooking(slug: string, ownerId: string, room: PublicQuarto, input: BookingInput): Promise<BookingResult> {
  bookingDates(input, room.capacidade)
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("criar_reserva_publica", {
      p_slug: slug, p_quarto_id: room.id, p_nome: input.nome_hospede,
      p_email: input.email, p_telefone: input.telefone, p_entrada: input.check_in,
      p_saida: input.check_out, p_adultos: input.adultos, p_metodo: input.metodo_pagamento,
    })
    if (error) throw error
    return data as BookingResult
  }
  // Apenas demonstração local: não oferece garantias de concorrência entre navegadores.
  const { valor_total: total } = await quotePublicBooking(slug, ownerId, room, input)
  const r = await dbInsert<Reserva>("reservas", {
    id: uid(), user_id: ownerId, quarto_id: room.id, ...input,
    estado: "pendente", valor_total: total, codigo_reserva: "HSP-" + uid().replace(/-/g, "").slice(0, 10).toUpperCase(), origem: "direta",
  })
  return { codigo_reserva: r.codigo_reserva, valor_total: r.valor_total }
}
