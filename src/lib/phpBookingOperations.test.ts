import { describe, expect, it } from "vitest"
import { phpBookingCsv, phpConfirmationMessage, type PhpBooking } from "./phpBookingOperations"

const booking: PhpBooking = {
  id: "1", quarto_id: "2", codigo_reserva: "HSP-TEST", nome_hospede: "=CMD()", email: "hospede@example.invalid",
  telefone: "81999999999", check_in: "2027-01-10", check_out: "2027-01-12", adultos: 2,
  estado: "confirmada", metodo_pagamento: "pix", valor_total: 250,
  confirmada_em: "2026-12-01 10:00:00", motivo_cancelamento: null,
}

describe("reservas do painel PHP", () => {
  it("protege CSV contra fórmulas e não afirma que o pagamento foi verificado", () => {
    const csv = phpBookingCsv([booking])
    expect(csv).toContain("\"'=CMD()\"")
    expect(csv).not.toContain("\"=CMD()\"")
    expect(csv).toContain("HSP-TEST")
    const message = phpConfirmationMessage(booking, "Pousada A", "Quarto 1")
    expect(message).toContain("O pagamento não foi verificado")
    expect(message).toContain("envio manual")
  })
  it("recusa mensagem de confirmação para estadia não confirmada", () => {
    expect(() => phpConfirmationMessage({ ...booking, estado: "pendente" }, "Pousada", "Quarto")).toThrow()
  })
})
