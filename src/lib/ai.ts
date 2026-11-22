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
    return "Tudo pronto para a sua chegada! Aqui vão as regras da casa: check-in a partir das 14h, check-out até às 11h, sem fumar nos quartos. Peça à receção o código de acesso do quarto antes de entrar. Qualquer questão, responda a esta mensagem."
  }
  if (p.includes("boas-vindas") || p.includes("welcome") || p.includes("mensagem")) {
    return "Olá! Seja muito bem-vindo(a). Reservou direto connosco, sem taxa de plataforma — e isso significa que cuidamos de si do início ao fim. A pousada acompanha o seu check-in por aqui."
  }
  if (p.includes("resumo") || p.includes("relatório")) {
    return "Consulte o painel para ver as reservas e os pagamentos verificados. Não apresento números sem consultar os dados da sua pousada."
  }
  return "Posso ajudar a preparar uma resposta. Confirme os detalhes com a pousada antes de enviar."
}

/** Gera mensagem de boas-vindas personalizada para o check-in */
export async function aiWelcomeMessage(nome: string, pousada: string, quarto: string): Promise<string> {
  return aiGenerate(
    `Escreva uma mensagem curta de boas-vindas para o hóspede ${nome} que reservou o quarto ${quarto} na pousada ${pousada}. Inclua: agradecimento pela reserva direta, próximos passos do check-in e tom acolhedor.`,
    "É um anfitrião de pousada em Portugal. Responda em português europeu, máximo 80 palavras."
  )
}
