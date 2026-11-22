import { describe, expect, it } from "vitest"
import { webcrypto } from "node:crypto"
import { hashDemoPassword, verifyDemoPassword } from "./demoCredentials"

describe("credenciais do modo de demonstração", () => {
  it("guarda salt e hash, não a palavra-passe original", async () => {
    Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true })
    const first = await hashDemoPassword("palavra-passe-teste")
    const second = await hashDemoPassword("palavra-passe-teste")
    expect(first.hash).not.toBe(second.hash)
    expect(JSON.stringify(first)).not.toContain("palavra-passe-teste")
    expect(await verifyDemoPassword({ id: "1", email: "a@b.com", nome: "A", ...first }, "palavra-passe-teste")).toBe(true)
    expect(await verifyDemoPassword({ id: "1", email: "a@b.com", nome: "A", ...first }, "outra-palavra-passe")).toBe(false)
  })
  it("permite validar conta antiga para migração após início de sessão", async () => {
    expect(await verifyDemoPassword({ id: "1", email: "a@b.com", nome: "A", password: "antiga" }, "antiga")).toBe(true)
  })
})
