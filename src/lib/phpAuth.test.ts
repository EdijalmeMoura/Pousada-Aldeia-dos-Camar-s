import { afterEach, describe, expect, it, vi } from "vitest"
import { clearPhpSession, phpWrite } from "./phpAuth"
import { phpRequest } from "./phpBackend"

vi.mock("./phpBackend", () => ({ phpRequest: vi.fn() }))
afterEach(() => { clearPhpSession(); vi.clearAllMocks() })

describe("sessão PHP", () => {
  it("obtém o CSRF da sessão antes da primeira escrita e roda o token recebido", async () => {
    const request = vi.mocked(phpRequest)
    request.mockResolvedValueOnce({ account: null, csrf: "token-inicial" })
      .mockResolvedValueOnce({ account: { id: "a" }, csrf: "token-novo" })
      .mockResolvedValueOnce({ id: "quarto" })
    await phpWrite("login", { email: "x@y.pt" })
    await phpWrite("add-room", { nome: "Quarto" })
    expect(request).toHaveBeenCalledWith("session")
    expect(request).toHaveBeenCalledWith("login", {}, { email: "x@y.pt" }, "token-inicial")
    expect(request).toHaveBeenCalledWith("add-room", {}, { nome: "Quarto" }, "token-novo")
  })
})
