import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useEffect } from "react"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export function uid() { return crypto.randomUUID() }
export function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "pousada"
}
export function brl(n: number) { return n.toLocaleString("pt-PT", { style: "currency", currency: "BRL" }) }
export function useSeo(title: string, description: string) {
  useEffect(() => {
    document.title = title
    let m = document.querySelector('meta[name="description"]')
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m) }
    m.setAttribute("content", description)
  }, [title, description])
}
