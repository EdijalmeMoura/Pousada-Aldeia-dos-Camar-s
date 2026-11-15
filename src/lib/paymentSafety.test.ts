import { describe, expect, it } from "vitest"
import { cents, confirmedPayment, checkoutAddress } from "../../supabase/functions/_shared/payment"

describe("verificação de pagamentos InfinitePay", () => {
  it("converte valor em centavos e rejeita valores impossíveis", () => {
    expect(cents("320.50")).toBe(32050)
    expect(() => cents("NaN")).toThrow()
    expect(() => cents(0)).toThrow()
  })
  it("só aceita confirmação explícita com valor exato", () => {
    expect(confirmedPayment({ success: true, paid: true, amount: 32050 }, 32050)).toBe(true)
    expect(confirmedPayment({ success: true, paid: true, amount: 32049 }, 32050)).toBe(false)
    expect(confirmedPayment({ success: true, paid: false, amount: 32050 }, 32050)).toBe(false)
    expect(confirmedPayment({ success: false, paid: true, amount: 32050 }, 32050)).toBe(false)
  })
  it("rejeita destinos de checkout alheios à InfinitePay", () => {
    expect(checkoutAddress("https://checkout.infinitepay.io/loja/link")).toBe(true)
    expect(checkoutAddress("https://checkout.infinitepay.io.evil.test/loja")).toBe(false)
    expect(checkoutAddress("javascript:alert(1)")).toBe(false)
  })
})
