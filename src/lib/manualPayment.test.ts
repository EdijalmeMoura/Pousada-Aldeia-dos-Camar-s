import { describe, expect, it } from "vitest"
import { paymentMessage, validatePaymentDetails } from "./manualPayment"

const booking = { nome_hospede: "Maria", codigo_reserva: "HSP-123", valor_total: 320, metodo_pagamento: "pix" as const }
const profile = { nome_pousada: "Mar Azul", chave_pix: "pix@marazul.com", link_pagamento: "https://pagamentos.example/123" }

describe("cobrança manual", () => {
  it("exige HTTPS no link configurado", () => {
    expect(validatePaymentDetails("", "javascript:alert(1)")).not.toBeNull()
    expect(validatePaymentDetails("", "http://pagamentos.example")).not.toBeNull()
    expect(validatePaymentDetails(profile.chave_pix, profile.link_pagamento)).toBeNull()
  })
  it("usa a preferência PIX sem afirmar que foi pago", () => {
    const text = paymentMessage(booking, profile)
    expect(text).toContain(profile.chave_pix)
    expect(text).toContain("após verificação")
    expect(text).not.toContain(profile.link_pagamento)
  })
  it("usa link para cartão e nunca usa a chave PIX nesse caso", () => {
    const text = paymentMessage({ ...booking, metodo_pagamento: "cartao" }, profile)
    expect(text).toContain(profile.link_pagamento)
    expect(text).not.toContain(profile.chave_pix)
  })
})
