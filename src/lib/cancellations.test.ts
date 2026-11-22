import { beforeEach, describe, expect, it, vi } from "vitest"
import { cancelReservation, cancellationReason, registerManualRefund } from "./cancellations"
import { dbInsert, dbList, type Reserva } from "./db"
vi.mock("./supabase", () => ({ supabase: null, isSupabaseConfigured: false }))
const sample = (): Reserva => ({ id: "r1", user_id: "owner", quarto_id: "room", nome_hospede: "Ana", email: "ana@example.com", telefone: "81999999999", check_in: "2027-01-01", check_out: "2027-01-02", adultos: 1, estado: "confirmada", metodo_pagamento: "pix", valor_total: 100, codigo_reserva: "HSP-123", origem: "direta", created_at: "2027-01-01", updated_at: "2027-01-01" })
beforeEach(() => { const store = new Map<string, string>(); vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) }) })
describe("cancelamentos", () => {
  it("exige motivo adequado", () => { expect(() => cancellationReason(" não ")).toThrow(); expect(cancellationReason("Problema com o quarto")).toBe("Problema com o quarto") })
  it("não cancela checkout ativo ainda não pago", async () => { await expect(cancelReservation({ ...sample(), checkout_url: "https://checkout.infinitepay.io/123", pagamento_estado: "aguarda_pagamento" }, "owner", "Motivo suficiente")).rejects.toThrow("checkout") })
  it("assinala pagamento verificado para análise e só regista reembolso manual com referência", async () => {
    const r = await dbInsert<Reserva>("reservas", { ...sample(), pagamento_estado: "pago" })
    expect(await cancelReservation(r, "owner", "Cancelamento pedido pelo hóspede")).toEqual({ reembolso_estado: "requer_analise" })
    const canceled = (await dbList<Reserva>("reservas", "owner"))[0]
    await expect(registerManualRefund(canceled, "owner", "abc")).rejects.toThrow("referência")
    await registerManualRefund(canceled, "owner", "REF-12345")
    expect((await dbList<Reserva>("reservas", "owner"))[0].reembolso_estado).toBe("registado_manual")
  })
})
