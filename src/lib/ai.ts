import { supabase, isSupabaseConfigured } from "./supabase"

/**
 * IA via Lovable AI Gateway (edge function "ai-generate", modelo google/gemini-2.5-flash).
 * Nunca pede API key ao utilizador. Em modo local, usa um motor heurístico offline.
 */
export async function aiGenerate(prompt: string, system = "É um assistente de pousada acolhedor e eficiente. Responda em português europeu, de forma breve e calorosa."): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke("ai-generate", { body: { prompt, system } })
    if (error) throw error
    if (data?.text) return data.text as string
    throw new Error("Resposta de IA vazia")
  }
  await new Promise((r) => setTimeout(r, 700))
  return localBrain(prompt)
}

function localBrain(prompt: string): string {
  const p = prompt.toLowerCase()
  if (p.includes("check-in") || p.includes("checkin") || p.includes("regras") || p.includes("código")) {
    return "Tudo pronto para a sua chegada! Aqui vão as regras da casa: check-in a partir das 14h, check-out até às 11h, sem fumar nos quartos. O código do seu quarto é 4821 — a porta fica no corredor principal, à direita da receção. Qualquer questão, responda a esta mensagem."
  }
  if (p.includes("boas-vindas") || p.includes("welcome") || p.includes("mensagem")) {
    return "Olá! Seja muito bem-vindo(a). Reservou direto connosco, sem taxa de plataforma — e isso significa que cuidamos de si do início ao fim. O check-in demora menos de um minuto por aqui."
  }
  if (p.includes("resumo") || p.includes("relatório")) {
    return "Resumo do dia: reservas diretas em crescimento, check-ins fluídos e hóspedes satisfeitos. Continue a partilhar o seu link direto — cada reserva direta poupa-lhe 15 a 20% de comissão."
  }
  return "Com todo o gosto! Já tratei disso por si. Se precisar de mais alguma coisa, é só dizer."
}

/** Gera mensagem de boas-vindas personalizada para o check-in */
export async function aiWelcomeMessage(nome: string, pousada: string, quarto: string): Promise<string> {
  return aiGenerate(
    `Escreva uma mensagem curta de boas-vindas para o hóspede ${nome} que reservou o quarto ${quarto} na pousada ${pousada}. Inclua: agradecimento pela reserva direta, próximos passos do check-in e tom acolhedor.`,
    "É um anfitrião de pousada em Portugal. Responda em português europeu, máximo 80 palavras."
  )
}
