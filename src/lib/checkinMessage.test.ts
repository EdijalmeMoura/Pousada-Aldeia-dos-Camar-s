import { describe, expect, it } from "vitest"
import { prepareCheckinMessage } from "./checkinMessage"
import type { Profile, Quarto, Reserva } from "./db"
const r = { id: "reservation", quarto_id: "room", estado: "confirmada", nome_hospede: "Ana", codigo_reserva: "HSP-123", check_in: "2027-01-01" } as Reserva
const room = { id: "room", nome: "Suíte Mar", codigo: "9082" } as Quarto
const p = { nome_pousada: "Mar Azul", regras_casa: "Silêncio após as 22h." } as Profile

describe("instruções de check-in", () => {
  it("recusa reservas pendentes, identidade não confirmada e códigos ausentes", () => {
    expect(() => prepareCheckinMessage({ ...r, estado: "pendente" }, room, p, true)).toThrow("Confirme a reserva")
    expect(() => prepareCheckinMessage(r, room, p, false)).toThrow("identidade")
    expect(() => prepareCheckinMessage(r, { ...room, codigo: "" }, p, true)).toThrow("código real")
    expect(() => prepareCheckinMessage(r, { ...room, id: "outra" }, p, true)).toThrow("código real")
  })
  it("usa apenas o código real do quarto correspondente", () => {
    const message = prepareCheckinMessage(r, room, p, true)
    expect(message).toContain("9082")
    expect(message).toContain("Silêncio após as 22h.")
    expect(message).not.toContain("4821")
  })
})
