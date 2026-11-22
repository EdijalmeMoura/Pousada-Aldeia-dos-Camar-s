import { dbUpdate, logActivity, type Reserva } from "./db"
import { supabase } from "./supabase"

export function cancellationReason(reason: string) {
  const value = reason.trim()
  if (value.length < 5 || value.length > 500) throw new Error("Indique um motivo com 5 a 500 caracteres.")
  return value
}

export async function cancelReservation(r: Reserva, ownerId: string, reason: string) {
  const motivo = cancellationReason(reason)
  if (!["pendente", "confirmada"].includes(r.estado)) throw new Error("Esta reserva já não pode ser cancelada.")
  if (r.pagamento_estado === "aguarda_pagamento" && r.checkout_url) throw new Error("Existe um checkout InfinitePay ativo: verifique o estado junto do prestador antes de cancelar.")
  if (supabase) {
    const { data, error } = await supabase.rpc("cancelar_reserva", { p_id: r.id, p_motivo: motivo })
    if (error) throw error
    return data as { reembolso_estado: string }
  }
  const state = r.pagamento_estado === "pago" ? "requer_analise" : "nao_aplicavel"
  await dbUpdate<Reserva>("reservas", r.id, { estado: "cancelada", motivo_cancelamento: motivo,
    cancelada_em: new Date().toISOString(), reembolso_estado: state })
  await logActivity(ownerId, "cancelamento", `Reserva ${r.codigo_reserva} cancelada: ${motivo}`)
  return { reembolso_estado: state }
}

export async function registerManualRefund(r: Reserva, ownerId: string, reference: string) {
  const value = reference.trim()
  if (value.length < 5 || value.length > 200) throw new Error("Indique a referência da operação (5 a 200 caracteres).")
  if (r.estado !== "cancelada" || r.reembolso_estado !== "requer_analise") throw new Error("Não existe reembolso pendente para esta reserva.")
  if (supabase) {
    const { error } = await supabase.rpc("registar_reembolso_manual", { p_id: r.id, p_referencia: value })
    if (error) throw error
    return
  }
  await dbUpdate<Reserva>("reservas", r.id, { reembolso_estado: "registado_manual", reembolso_referencia: value })
  await logActivity(ownerId, "reembolso", `Reembolso manual da reserva ${r.codigo_reserva} registado: ${value}`)
}
