import { beforeEach, describe, expect, it, vi } from "vitest"
import { publicSlug } from "./publicSlug"
import { newProfile, saveProfile } from "./db"
vi.mock("./supabase", () => ({ supabase: null, isSupabaseConfigured: false }))
beforeEach(() => { const store = new Map<string, string>(); vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) }) })
describe("link público", () => {
  it("não colide com rotas internas ou pastas de assets", () => {
    for (const value of ["app", "login", "Configuracoes", "assets", "privacidade", "api"]) expect(() => publicSlug(value)).toThrow()
    expect(() => publicSlug("a")).toThrow()
    expect(publicSlug("Pousada Brisa do Mar")).toBe("pousada-brisa-do-mar")
  })
  it("impede dois perfis com o mesmo endereço no modo local", async () => {
    const first = { ...newProfile({ id: "user1", email: "1@example.com" }), slug: "brisa-do-mar" }
    const second = { ...newProfile({ id: "user2", email: "2@example.com" }), slug: "brisa-do-mar" }
    await saveProfile(first)
    await expect(saveProfile(second)).rejects.toThrow("já está em uso")
  })
})
