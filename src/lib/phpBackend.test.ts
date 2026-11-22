import { afterEach, describe, expect, it, vi } from "vitest"
import { phpRequest } from "./phpBackend"

afterEach(() => { vi.unstubAllGlobals() })

describe("cliente PHP", () => {
  it("usa o caminho da aplicação na mesma origem e não cai em armazenamento local", async () => {
    vi.stubGlobal("location", { origin: "https://example.org" })
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ noites: 2, valor_total: 300 }) })
    vi.stubGlobal("fetch", fetch)
    expect(await phpRequest("quote", { slug: "pousada-1" })).toEqual({ noites: 2, valor_total: 300 })
    const [url, options] = fetch.mock.calls[0]
    expect(url.origin).toBe("https://example.org")
    expect(url.pathname).toContain("/api/index.php")
    expect(url.searchParams.get("slug")).toBe("pousada-1")
    expect(options.credentials).toBe("same-origin")
  })

  it("avisa a interface quando a sessão PHP expira", async () => {
    vi.stubGlobal("location", { origin: "https://example.org" })
    const target = new EventTarget()
    vi.stubGlobal("window", target)
    const revoked = vi.fn()
    target.addEventListener("hospedae:php-unauthorized", revoked)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({ error: "Autenticação necessária." }) }))
    await expect(phpRequest("my-bookings")).rejects.toThrow("Autenticação necessária")
    expect(revoked).toHaveBeenCalledOnce()
  })

  it("falha visivelmente quando o servidor devolve erro ou HTML", async () => {
    vi.stubGlobal("location", { origin: "https://example.org" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Quarto indisponível" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("html") } }))
    await expect(phpRequest("reservar", {}, { slug: "teste" })).rejects.toThrow("Quarto indisponível")
    await expect(phpRequest("pousada")).rejects.toThrow("servidor de reservas não respondeu")
  })
})
