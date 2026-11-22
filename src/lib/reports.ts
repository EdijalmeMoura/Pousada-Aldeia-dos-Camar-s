import type { Bloqueio, Quarto, Reserva } from "./db"

export function monthlyReport(month: string, rooms: Quarto[], bookings: Reserva[], blocks: Bloqueio[]) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mês inválido")
  const [year, index] = month.split("-").map(Number)
  const first = new Date(Date.UTC(year, index - 1, 1))
  const days = new Date(Date.UTC(year, index, 0)).getUTCDate()
  const activeRooms = rooms.filter(r => r.ativo)
  const rows = bookings.filter(r => r.check_in.startsWith(month))
  const effective = rows.filter(r => r.estado !== "cancelada")
  let available = 0
  let occupied = 0
  for (const room of activeRooms) {
    for (let day = 0; day < days; day++) {
      const current = new Date(first.getTime() + day * 864e5).toISOString().slice(0, 10)
      const blocked = blocks.some(b => b.quarto_id === room.id && b.data_inicio <= current && current < b.data_fim)
      if (blocked) continue
      available++
      if (bookings.some(r => r.quarto_id === room.id && ["confirmada", "concluida"].includes(r.estado) && r.check_in <= current && current < r.check_out)) occupied++
    }
  }
  return {
    total: rows.length,
    direct: effective.filter(r => r.origem === "direta").length,
    platform: effective.filter(r => r.origem === "plataforma").length,
    pending: rows.filter(r => r.estado === "pendente").length,
    canceled: rows.filter(r => r.estado === "cancelada").length,
    bookedValue: effective.reduce((sum, r) => sum + Number(r.valor_total), 0),
    verifiedValue: effective.filter(r => r.pagamento_estado === "pago").reduce((sum, r) => sum + Number(r.valor_total), 0),
    availableNights: available,
    occupiedNights: occupied,
    occupancy: available ? Math.round(occupied / available * 100) : 0,
  }
}
