import type { Reserva } from "./db"

export type ExportFilter = { from: string; to: string; state: "todos" | Reserva["estado"] }

/** Não permitir que dados escritos por hóspedes sejam executados como fórmulas no Excel/Sheets. */
export function csvCell(value: unknown): string {
  const text = String(value ?? "").replace(/\r?\n/g, " ")
  const safe = /^[\s\x00-\x1f]*[=+@\-]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

export function filterReservations(rows: Reserva[], filter: ExportFilter): Reserva[] {
  return rows.filter(r =>
    (!filter.from || r.check_in >= filter.from) &&
    (!filter.to || r.check_in <= filter.to) &&
    (filter.state === "todos" || r.estado === filter.state)
  )
}

export function reservationCsv(rows: Reserva[]): string {
  const fields: (keyof Reserva)[] = ["codigo_reserva", "nome_hospede", "email", "telefone", "check_in", "check_out", "adultos", "estado", "metodo_pagamento", "valor_total", "origem", "pagamento_estado"]
  const labels = ["Código", "Hóspede", "E-mail", "Telefone", "Entrada", "Saída", "Adultos", "Estado", "Método", "Valor (BRL)", "Origem", "Pagamento"]
  return "\uFEFF" + [labels.map(csvCell).join(";"), ...rows.map(r => fields.map(f => csvCell(r[f])).join(";"))].join("\r\n") + "\r\n"
}

export function downloadReservations(rows: Reserva[]) {
  const url = URL.createObjectURL(new Blob([reservationCsv(rows)], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `hospedae-reservas-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
