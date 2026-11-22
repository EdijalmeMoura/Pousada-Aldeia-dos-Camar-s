import { describe, expect, it } from "vitest"
import { csvCell, filterReservations, reservationCsv } from "./reservationExport"
import type { Reserva } from "./db"

const row = (patch: Partial<Reserva> = {}): Reserva => ({
  id: "r1", user_id: "owner", quarto_id: "room", nome_hospede: "Maria", email: "m@example.com",
  telefone: "81999999999", check_in: "2027-03-15", check_out: "2027-03-18",
  adultos: 2, estado: "confirmada", metodo_pagamento: "pix", valor_total: 350,
  codigo_reserva: "HSP-1", origem: "direta", created_at: "2027-01-01", updated_at: "2027-01-01", ...patch,
})

describe("exportação de reservas", () => {
  it("impede fórmulas e escapa aspas, quebras e delimitadores", () => {
    expect(csvCell(' =1+1')).toBe('"\' =1+1"')
    expect(csvCell('@SUM(1)')).toBe('"\'@SUM(1)"')
    expect(csvCell('Ana; "Teste"\nOutra')).toBe('"Ana; ""Teste"" Outra"')
    expect(reservationCsv([row({ nome_hospede: '=HYPERLINK("url")' })])).toContain("'=HYPERLINK")
  })
  it("filtra por entrada inclusiva e estado", () => {
    const rows = [row(), row({ id: "r2", check_in: "2027-03-16", estado: "cancelada" })]
    expect(filterReservations(rows, { from: "2027-03-15", to: "2027-03-15", state: "confirmada" })).toHaveLength(1)
    expect(filterReservations(rows, { from: "2027-03-16", to: "", state: "todos" })).toHaveLength(1)
  })
})
