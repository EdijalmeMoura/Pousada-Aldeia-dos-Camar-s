import { describe, expect, it } from "vitest"
import { loginSchema, signupSchema } from "./authValidation"
import { authDestination } from "./authRouting"

describe("autenticação e onboarding", () => {
  it("login só pede e-mail e palavra-passe e aceita contas antigas com palavra-passe curta", () => {
    expect(loginSchema.safeParse({ email: "ana@example.com", password: "abc" }).success).toBe(true)
    expect(loginSchema.safeParse({ email: "invalido", password: "abc" }).success).toBe(false)
  })
  it("registo exige nome e palavra-passe com pelo menos 6 caracteres", () => {
    expect(signupSchema.safeParse({ nome: "Ana", email: "ana@example.com", password: "123456" }).success).toBe(true)
    expect(signupSchema.safeParse({ nome: "A", email: "ana@example.com", password: "abc" }).success).toBe(false)
  })
  it("não redireciona o onboarding para si próprio", () => {
    expect(authDestination(true, false, true)).toBeNull()
    expect(authDestination(true, false, false)).toBe("/onboarding")
    expect(authDestination(true, true, true)).toBe("/app")
    expect(authDestination(false, undefined, true)).toBe("/login")
  })
})
