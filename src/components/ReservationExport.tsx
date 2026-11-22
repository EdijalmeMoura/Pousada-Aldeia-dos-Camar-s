import { useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import type { Reserva } from "@/lib/db"
import { downloadReservations, filterReservations, type ExportFilter } from "@/lib/reservationExport"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ReservationExport({ rows }: { rows: Reserva[] }) {
  const [filter, setFilter] = useState<ExportFilter>({ from: "", to: "", state: "todos" })
  const filtered = filterReservations(rows, filter)
  const exportFile = () => {
    if (filter.from && filter.to && filter.to < filter.from) return toast.error("A data final deve ser igual ou posterior à data inicial.")
    if (!filtered.length) return toast.error("Não existem reservas para exportar com estes filtros.")
    try { downloadReservations(filtered); toast.success(`${filtered.length} reserva(s) exportada(s). Guarde o ficheiro em local seguro.`) }
    catch { toast.error("Não foi possível gerar o ficheiro CSV.") }
  }
  return <section className="space-y-3 rounded-2xl border bg-card p-4" aria-label="Exportar reservas">
    <div><h2 className="font-semibold">Exportar reservas</h2><p className="text-xs text-muted-foreground">Inclui dados pessoais dos hóspedes. Use apenas para gestão da pousada e elimine cópias desnecessárias.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1"><Label htmlFor="export-from">Entrada desde</Label><Input id="export-from" type="date" value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} /></div>
      <div className="space-y-1"><Label htmlFor="export-to">Entrada até</Label><Input id="export-to" type="date" value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} /></div>
      <div className="space-y-1"><Label htmlFor="export-state">Estado</Label><select id="export-state" value={filter.state} onChange={e => setFilter(f => ({ ...f, state: e.target.value as ExportFilter["state"] }))} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="todos">Todos</option><option value="pendente">Pendentes</option><option value="confirmada">Confirmadas</option><option value="cancelada">Canceladas</option><option value="concluida">Concluídas</option></select></div>
      <div className="flex items-end"><Button onClick={exportFile} className="w-full"><Download className="h-4 w-4" /> Descarregar CSV ({filtered.length})</Button></div>
    </div>
  </section>
}
