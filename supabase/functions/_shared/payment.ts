/** Regras puras partilhadas pelas funções InfinitePay. Nunca confiar em preço do browser ou webhook. */
export function cents(value: unknown): number {
  const amount = Math.round(Number(value) * 100)
  if (!Number.isSafeInteger(amount) || amount < 100) throw new Error("Valor inválido")
  return amount
}

export function confirmedPayment(response: { success?: unknown; paid?: unknown; amount?: unknown }, expectedCents: number): boolean {
  return response.success === true && response.paid === true &&
    Number.isSafeInteger(Number(response.amount)) && Number(response.amount) === expectedCents
}

export function checkoutAddress(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "checkout.infinitepay.io"
  } catch { return false }
}
