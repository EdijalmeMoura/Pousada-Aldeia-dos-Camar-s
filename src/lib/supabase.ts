import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)
export const supabase = isSupabaseConfigured ? createClient(url!, key!) : null

/** Normaliza número brasileiro para DDI 55 + DDD + número */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "")
  if (d.startsWith("55") && d.length >= 12) return d
  if (d.length === 11 || d.length === 10) return "55" + d
  return d
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`
}

export const waTemplates = {
  cobranca: (nome: string, valor: string) =>
    `Olá ${nome}! A sua reserva está quase confirmada. Para garantir a estadia, finalize o pagamento de ${valor} via PIX. Qualquer dúvida, estou por aqui.`,
  lembrete: (nome: string, data: string) =>
    `Olá ${nome}! Lembrete amigável: a sua chegada está marcada para ${data}. O check-in é rápido e conversacional — basta responder a esta mensagem.`,
  followUp: (nome: string) =>
    `Olá ${nome}! Esperamos que tenha tido uma estadia maravilhosa. Se puder partilhar a sua experiência, ficamos muito gratos. Até breve!`,
  boasVindas: (nome: string, pousada: string) =>
    `Olá ${nome}! Bem-vindo(a) à ${pousada}. A sua reserva direta foi registada sem taxa de plataforma. Vou guiá-lo no check-in em poucos instantes.`,
}
