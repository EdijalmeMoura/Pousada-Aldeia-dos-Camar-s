import { z } from "zod"

export const publicBookingSchema = z.object({
  nome_hospede: z.string().trim().min(2, "Indique o seu nome"),
  email: z.string().trim().email("Indique um e-mail válido"),
  telefone: z.string().regex(/^\+?[\d\s()-]{10,20}$/, "Indique um telefone válido com DDD"),
  check_in: z.string().min(1, "Escolha a data de entrada"),
  check_out: z.string().min(1, "Escolha a data de saída"),
  adultos: z.coerce.number().int().min(1, "Pelo menos 1 adulto"),
  metodo_pagamento: z.enum(["pix", "cartao"]),
  aceito_privacidade: z.boolean().refine(Boolean, "Aceite os termos e a política de privacidade para continuar."),
}).superRefine((data, ctx) => {
  if (!data.check_in || !data.check_out) return
  const today = new Date().toISOString().slice(0, 10)
  if (data.check_in < today) ctx.addIssue({ code: "custom", path: ["check_in"], message: "Escolha uma data de entrada a partir de hoje." })
  const nights = Math.round((Date.parse(`${data.check_out}T12:00:00Z`) - Date.parse(`${data.check_in}T12:00:00Z`)) / 864e5)
  if (!Number.isFinite(nights) || nights < 1 || nights > 90) ctx.addIssue({ code: "custom", path: ["check_out"], message: "A saída deve ser posterior à entrada (máximo 90 noites)." })
})
export type PublicBookingForm = z.infer<typeof publicBookingSchema>
