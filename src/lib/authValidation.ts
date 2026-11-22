import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Indique um e-mail válido"),
  password: z.string().min(1, "Indique a palavra-passe"),
})
export const signupSchema = loginSchema.extend({
  nome: z.string().trim().min(2, "Indique o seu nome"),
  password: z.string().min(6, "A palavra-passe deve ter pelo menos 6 caracteres"),
})
export type LoginForm = z.infer<typeof loginSchema>
export type SignupForm = z.infer<typeof signupSchema>
