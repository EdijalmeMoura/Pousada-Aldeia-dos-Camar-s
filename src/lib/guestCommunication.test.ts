import { describe, expect, it } from "vitest"
import { confirmationMailto, confirmationMessage } from "./guestCommunication"
import type { Reserva } from "./db"
const r: Reserva = {
  id: "1", user_id: "owner", quarto_id: "room", nome_hospede: "Ana Lima", email: "ana@example.com",
  telefone: "81999999999", check_in: "2027-01-12", check_out: "2027-01-15", adultos: 2,
  estado: "confirmada", metodo_pagamento: "pix", valor_total: 900, codigo_reserva: "HSP-123",
  origem: "direta", created_at: "2027-01-01", updated_at: "2027-01-01",
}
describe("comunicação com o hóspede", () => {
  it("não comunica reservas pendentes ou canceladas como confirmadas", () => {
    expect(() => confirmationMessage({ ...r, estado: "pendente" }, "Mar", "Suite")).toThrow()
    expect(() => confirmationMessage({ ...r, estado: "cancelada" }, "Mar", "Suite")).toThrow()
  })
  it("distingue pagamento não verificado e verificado", () => {
    expect(confirmationMessage(r, "Mar", "Suite")).toContain("ainda não consta como verificado")
    expect(confirmationMessage({ ...r, pagamento_estado: "pago" }, "Mar", "Suite")).toContain("verificado na plataforma")
  })
  it("codifica e-mail e conteúdo na ligação mailto", () => {
    const url = confirmationMailto("ana+1@example.com", "Reserva #1", "Olá & bem-vinda")
    expect(url).toContain("ana%2B1%40example.com")
    expect(url).toContain("%26")
  })
})
