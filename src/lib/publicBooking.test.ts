import { beforeEach, describe, expect, it, vi } from "vitest"
import { bookingDates, createPublicBooking, quotePublicBooking, type PublicQuarto } from "./publicBooking"
import { dbInsert, type Bloqueio, type Tarifa } from "./db"

vi.mock("./supabase", () => ({ isSupabaseConfigured: false, supabase: null }))

const room: PublicQuarto = {
  id: "room-1", nome: "Suíte", descricao: "", capacidade: 2,
  preco_base: 100, comodidades: "", foto_url: "", ativo: true,
}
const today = new Date()
today.setUTCDate(today.getUTCDate() + 10)
const date = (offset: number) => {
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}
const booking = () => ({ nome_hospede: "Ana Lima", email: "ana@example.com", telefone: "81999999999",
  check_in: date(0), check_out: date(2), adultos: 2, metodo_pagamento: "pix" as const, aceito_privacidade: true })

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  })
})

describe("reserva pública em demonstração", () => {
  it("rejeita datas invertidas, mais de 90 noites e capacidade excedida", () => {
    expect(() => bookingDates({ ...booking(), check_out: date(-1) }, 2)).toThrow("datas")
    expect(() => bookingDates({ ...booking(), check_out: date(91) }, 2)).toThrow("90")
    expect(() => bookingDates({ ...booking(), adultos: 3 }, 2)).toThrow("capacidade")
  })

  it("recusa pedidos sem declaração de aceitação", async () => {
    await expect(createPublicBooking("pousada", "owner", room, { ...booking(), aceito_privacidade: false })).rejects.toThrow("aceitar")
  })

  it("impede reservas em dias bloqueados e permite datas adjacentes", async () => {
    await dbInsert<Bloqueio>("bloqueios", { id: "block-1", user_id: "owner", quarto_id: room.id,
      data_inicio: date(1), data_fim: date(3), motivo: "Manutenção" })
    await expect(quotePublicBooking("pousada", "owner", room, booking())).rejects.toThrow("bloqueado")
    await expect(createPublicBooking("pousada", "owner", room, booking())).rejects.toThrow("bloqueado")
    await expect(quotePublicBooking("pousada", "owner", room,
      { ...booking(), check_in: date(3), check_out: date(4) })).resolves.toHaveProperty("valor_total", 100)
  })

  it("aplica tarifa sazonal por noite e recusa sobreposição", async () => {
    await dbInsert<Tarifa>("tarifas", { id: "season", user_id: "owner", quarto_id: room.id,
      temporada: "Alta", data_inicio: date(1), data_fim: date(1), preco_noite: 200 })
    const quote = await quotePublicBooking("pousada", "owner", room, booking())
    expect(quote).toEqual({ valor_total: 300, noites: 2 })
    const result = await createPublicBooking("pousada", "owner", room, booking())
    expect(result.valor_total).toBe(300)
    await expect(createPublicBooking("pousada", "owner", room, booking())).rejects.toThrow("reservado")
    const adjacent = { ...booking(), check_in: date(2), check_out: date(3) }
    await expect(createPublicBooking("pousada", "owner", room, adjacent)).resolves.toHaveProperty("valor_total", 100)
  })
})
