import type { Profile, Reserva } from "./db"
import { brl } from "./utils"

export function validatePaymentDetails(chavePix: string, linkPagamento: string): string | null {
  if (chavePix.length > 140) return "A chave PIX é demasiado longa."
  if (linkPagamento) {
    try {
      const url = new URL(linkPagamento)
      if (url.protocol !== "https:" || !url.hostname.includes(".")) throw new Error("invalid")
    } catch { return "O link de pagamento tem de ser um endereço HTTPS válido." }
  }
  return null
}

/** Mensagem pré-preenchida: o operador revê e envia manualmente; não comprova pagamento. */
export function paymentMessage(reserva: Pick<Reserva, "nome_hospede" | "codigo_reserva" | "valor_total" | "metodo_pagamento">,
  profile: Pick<Profile, "nome_pousada" | "chave_pix" | "link_pagamento">): string {
  const intro = `Olá ${reserva.nome_hospede}! A sua reserva ${reserva.codigo_reserva} na ${profile.nome_pousada} tem o valor de ${brl(reserva.valor_total)}.`
  const pix = profile.chave_pix?.trim()
  const link = profile.link_pagamento?.trim()
  const details = reserva.metodo_pagamento === "pix"
    ? (pix ? `Para pagar por PIX, use a chave: ${pix}.` : link ? `Pode usar este link de pagamento: ${link}` : "Entre em contacto connosco para combinar o pagamento por PIX.")
    : (link ? `Para pagar com cartão, use este link de pagamento: ${link}` : "Entre em contacto connosco para receber o link de pagamento por cartão.")
  return `${intro} ${details} Envie-nos o comprovativo. A confirmação será feita pela pousada após verificação do pagamento.`
}
