import type { Profile, Quarto, Reserva } from "./db"

/** Só prepara a mensagem; não envia WhatsApp nem verifica identidade. */
export function prepareCheckinMessage(r: Reserva, room: Quarto | undefined, profile: Profile | null, verified: boolean): string {
  if (r.estado !== "confirmada") throw new Error("Confirme a reserva antes de enviar os dados de acesso.")
  if (!verified) throw new Error("Confirme a identidade do hóspede antes de preparar o código.")
  if (!room || room.id !== r.quarto_id || !room.codigo?.trim()) throw new Error("Configure o código real do quarto antes de continuar.")
  const rules = profile?.regras_casa?.trim() || "Contacte a pousada para conhecer as regras da casa."
  return `Olá ${r.nome_hospede}! A sua reserva ${r.codigo_reserva} na ${profile?.nome_pousada || "pousada"} está confirmada. Entrada: ${r.check_in}. Regras da casa: ${rules} Código do quarto ${room.nome}: ${room.codigo.trim()}. Guarde este código em privado. Em caso de dúvidas, contacte a pousada.`
}
