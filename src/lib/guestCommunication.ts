import type { Reserva } from "./db"
import { brl } from "./utils"

export function confirmationMessage(r: Reserva, pousada: string, quarto: string): string {
  if (r.estado !== "confirmada" && r.estado !== "concluida") throw new Error("Confirme a reserva antes de avisar o hóspede.")
  const payment = r.pagamento_estado === "pago"
    ? "O pagamento consta como verificado na plataforma."
    : "O pagamento ainda não consta como verificado. Combine a forma de pagamento com a pousada."
  return `Olá ${r.nome_hospede}! A sua estadia na ${pousada} está confirmada. Reserva ${r.codigo_reserva}, quarto ${quarto}, entrada ${r.check_in}, saída ${r.check_out}, valor ${brl(r.valor_total)}. ${payment} Se precisar de ajuda, responda a esta mensagem.`
}

export function confirmationMailto(email: string, subject: string, message: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
}
