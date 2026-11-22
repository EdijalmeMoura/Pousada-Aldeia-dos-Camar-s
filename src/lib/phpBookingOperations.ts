import { csvCell } from "./reservationExport"
import { brl } from "./utils"

export type PhpBooking = {
  id: string; quarto_id: string; codigo_reserva: string; nome_hospede: string; email: string; telefone: string
  check_in: string; check_out: string; adultos: number; estado: string; metodo_pagamento: string
  valor_total: number; confirmada_em: string | null; motivo_cancelamento: string | null
}

export function phpConfirmationMessage(booking: PhpBooking, pousada: string, quarto: string): string {
  if (booking.estado !== "confirmada") throw new Error("Confirme a estadia antes de preparar a mensagem.")
  return `Olá ${booking.nome_hospede}! A sua estadia na ${pousada} está confirmada. Reserva ${booking.codigo_reserva}, quarto ${quarto}, entrada ${booking.check_in}, saída ${booking.check_out}, valor ${brl(Number(booking.valor_total))}. O pagamento não foi verificado pela plataforma; combine diretamente com a pousada. Esta é uma mensagem preparada para envio manual.`
}

export function phpBookingCsv(rows: PhpBooking[]): string {
  const fields: (keyof PhpBooking)[] = ["codigo_reserva", "nome_hospede", "email", "telefone", "check_in", "check_out", "adultos", "estado", "metodo_pagamento", "valor_total", "confirmada_em", "motivo_cancelamento"]
  const labels = ["Código", "Hóspede", "E-mail", "Telefone", "Entrada", "Saída", "Adultos", "Estado", "Método a combinar", "Valor (BRL)", "Confirmada em", "Motivo do cancelamento"]
  return "\uFEFF" + [labels.map(csvCell).join(";"), ...rows.map(row => fields.map(field => csvCell(row[field])).join(";"))].join("\r\n") + "\r\n"
}

export function downloadPhpBookings(rows: PhpBooking[]) {
  const url = URL.createObjectURL(new Blob([phpBookingCsv(rows)], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `hospedae-reservas-php-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
