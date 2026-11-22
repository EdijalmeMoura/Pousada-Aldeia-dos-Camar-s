import { describe, expect, it } from "vitest"
import { repository, systemUpdates } from "./systemUpdates"

describe("histórico de atualizações", () => {
  it("apresenta referências distintas para commits do projeto", () => {
    expect(systemUpdates.length).toBeGreaterThan(0)
    expect(new Set(systemUpdates.map(x => x.commit)).size).toBe(systemUpdates.length)
    for (const update of systemUpdates) {
      expect(update.commit).toMatch(/^[0-9a-f]{7,40}$/)
      expect(update.title.length).toBeGreaterThan(3)
      expect(update.summary.length).toBeGreaterThan(10)
    }
    expect(repository).toMatch(/^https:\/\/github\.com\//)
  })
})
