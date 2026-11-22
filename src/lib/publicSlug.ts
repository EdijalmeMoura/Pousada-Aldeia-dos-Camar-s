import { slugify } from "./utils"

/** Slugs reservados para rotas do produto e serviços usados pela aplicação. */
export const RESERVED_SLUGS = ["app", "signup", "login", "onboarding", "configuracoes", "privacidade", "termos", "api", "assets", "images", "favicon", "robots", "sitemap"] as const

export function publicSlug(value: string): string {
  const slug = slugify(value)
  if (slug.length < 3 || slug.length > 40 || RESERVED_SLUGS.includes(slug as typeof RESERVED_SLUGS[number])) {
    throw new Error("Escolha um link com 3 a 40 caracteres que não coincida com uma página da Hospedaê.")
  }
  return slug
}
