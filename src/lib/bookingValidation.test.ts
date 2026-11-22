import { describe, expect, it } from "vitest"
import { publicBookingSchema } from "./bookingValidation"
const after = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10)
const valid = () => ({ nome_hospede: "Ana Lima", email: "ana@example.com", telefone: "81999998888", check_in: after(3), check_out: after(5), adultos: 2, metodo_pagamento: "pix", aceito_privacidade: true })
describe("validação da reserva pública", () => {
  it("valida datas futuras, intervalo e capacidade mínima", () => {
    expect(publicBookingSchema.safeParse(valid()).success).toBe(true)
    expect(publicBookingSchema.safeParse({ ...valid(), check_out: after(2) }).success).toBe(false)
    expect(publicBookingSchema.safeParse({ ...valid(), check_out: after(95) }).success).toBe(false)
    expect(publicBookingSchema.safeParse({ ...valid(), adultos: 0 }).success).toBe(false)
  })
  it("pede telefone legível e aceitação da privacidade", () => {
    expect(publicBookingSchema.safeParse({ ...valid(), telefone: "XXXXXXXXXX" }).success).toBe(false)
    expect(publicBookingSchema.safeParse({ ...valid(), aceito_privacidade: false }).success).toBe(false)
  })
})
