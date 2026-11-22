import { describe, expect, it } from "vitest"
import { monthlyReport } from "./reports"
import type { Bloqueio, Quarto, Reserva } from "./db"
const room = { id: "room", ativo: true } as Quarto
const base = { quarto_id: "room", check_in: "2027-02-02", check_out: "2027-02-04", estado: "confirmada", origem: "direta", valor_total: 200, pagamento_estado: "nao_iniciado" } as Reserva
const block = { quarto_id: "room", data_inicio: "2027-02-05", data_fim: "2027-02-07" } as Bloqueio

describe("relatório mensal", () => {
  it("separa valor reservado de pagamento verificado e desconta bloqueios", () => {
    const result = monthlyReport("2027-02", [room], [base, { ...base, id: "2", check_in: "2027-02-10", check_out: "2027-02-11", pagamento_estado: "pago", valor_total: 100 }], [block])
    expect(result.availableNights).toBe(26)
    expect(result.occupiedNights).toBe(3)
    expect(result.bookedValue).toBe(300)
    expect(result.verifiedValue).toBe(100)
    expect(result.direct).toBe(2)
  })
  it("conta estadias iniciadas antes do mês na ocupação, mas não no valor de entrada", () => {
    const previous = { ...base, check_in: "2027-01-30", check_out: "2027-02-02", pagamento_estado: "pago" as const }
    const result = monthlyReport("2027-02", [room], [previous], [])
    expect(result.occupiedNights).toBe(1)
    expect(result.verifiedValue).toBe(0)
  })
  it("exclui cancelamentos e reservas pendentes da ocupação", () => {
    const result = monthlyReport("2027-02", [room], [{ ...base, estado: "cancelada" }, { ...base, estado: "pendente" }], [])
    expect(result.occupiedNights).toBe(0)
    expect(result.canceled).toBe(1)
    expect(result.pending).toBe(1)
    expect(result.bookedValue).toBe(200)
  })
})
