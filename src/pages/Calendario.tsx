import { useState } from "react"
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns"
import { pt as ptPT } from "date-fns/locale"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CalendarDays, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { dbDelete, dbInsert, dbList, type Bloqueio, type Quarto, type Reserva } from "@/lib/db"
import { uid, useSeo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/EmptyState"

export default function Calendario() {
  useSeo("Calendário — Hospedaê", "Consulte a ocupação e bloqueie datas dos seus quartos.")
  const { user } = useAuth()
  const qc = useQueryClient()
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [roomId, setRoomId] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const owner = user!.id
  const roomsQ = useQuery({ queryKey: ["quartos", owner], queryFn: () => dbList<Quarto>("quartos", owner) })
  const reservationsQ = useQuery({ queryKey: ["reservas", owner], queryFn: () => dbList<Reserva>("reservas", owner) })
  const blocksQ = useQuery({ queryKey: ["bloqueios", owner], queryFn: () => dbList<Bloqueio>("bloqueios", owner) })
  const rooms = roomsQ.data ?? []
  const reservations = reservationsQ.data ?? []
  const blocks = blocksQ.data ?? []
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const offset = (getDay(days[0]) + 6) % 7
  const key = (date: Date) => format(date, "yyyy-MM-dd")
  const active = roomId || rooms[0]?.id || ""

  const addBlock = async () => {
    if (!active || !start || !end || end <= start) return toast.error("Escolha um quarto e um período válido (a saída não está incluída).")
    if (reservations.some(r => r.quarto_id === active && ["pendente", "confirmada"].includes(r.estado) && r.check_in < end && r.check_out > start)) return toast.error("Já existe uma reserva nesse período.")
    if (blocks.some(b => b.quarto_id === active && b.data_inicio < end && b.data_fim > start)) return toast.error("Já existe um bloqueio nesse período.")
    setSaving(true)
    try {
      await dbInsert<Bloqueio>("bloqueios", { id: uid(), user_id: owner, quarto_id: active, data_inicio: start, data_fim: end, motivo: reason.trim() })
      await qc.invalidateQueries({ queryKey: ["bloqueios", owner] })
      setStart(""); setEnd(""); setReason("")
      toast.success("Datas bloqueadas. Os hóspedes não poderão reservá-las.")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível bloquear as datas.") }
    finally { setSaving(false) }
  }
  const remove = async (id: string) => {
    try { await dbDelete("bloqueios", id); await qc.invalidateQueries({ queryKey: ["bloqueios", owner] }); toast.success("Bloqueio removido.") }
    catch { toast.error("Não foi possível remover o bloqueio.") }
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Calendário de disponibilidade</h1><p className="text-sm text-muted-foreground">Reservas pendentes e confirmadas ocupam o quarto; bloqueios impedem novas reservas.</p></div>
    {roomsQ.isLoading || reservationsQ.isLoading || blocksQ.isLoading ? <p className="text-muted-foreground">A carregar calendário…</p>
      : roomsQ.isError || reservationsQ.isError || blocksQ.isError ? <p role="alert">Não foi possível carregar o calendário. <Button onClick={() => { roomsQ.refetch(); reservationsQ.refetch(); blocksQ.refetch() }}>Tentar novamente</Button></p>
      : rooms.length === 0 ? <Card><CardContent><EmptyState icon={CalendarDays} titulo="Sem quartos" subtitulo="Cadastre um quarto antes de gerir a disponibilidade." /></CardContent></Card>
      : <>
        <div className="max-w-sm space-y-2"><Label htmlFor="calendar-room">Quarto</Label><select id="calendar-room" value={active} onChange={e => setRoomId(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{rooms.map(q => <option key={q.id} value={q.id}>{q.nome}</option>)}</select></div>
        <Card><CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex items-center justify-between"><Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button><h2 className="font-semibold capitalize">{format(month, "MMMM yyyy", { locale: ptPT })}</h2><Button variant="outline" size="icon" aria-label="Mês seguinte" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs md:gap-2">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => <span key={d} className="py-2 font-semibold text-muted-foreground">{d}</span>)}{Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}
            {days.map(d => { const day = key(d); const r = reservations.find(x => x.quarto_id === active && ["pendente", "confirmada"].includes(x.estado) && x.check_in <= day && x.check_out > day); const b = blocks.find(x => x.quarto_id === active && x.data_inicio <= day && x.data_fim > day); return <div key={day} title={r ? `${r.nome_hospede} · ${r.estado}` : b ? `Bloqueado: ${b.motivo || "sem motivo"}` : "Disponível"} className={`min-h-14 rounded-xl border p-1.5 text-left md:min-h-20 md:p-2 ${r ? "border-primary/30 bg-primary/10" : b ? "border-destructive/30 bg-destructive/10" : "bg-card"}`}><span className="font-semibold">{format(d, "d")}</span><span className="mt-1 block truncate text-[10px] md:text-xs">{r ? r.nome_hospede : b ? "Bloqueado" : "Livre"}</span></div> })}
          </div>
          <p className="text-xs text-muted-foreground">A saída liberta o quarto nesse dia. <span className="text-primary">■</span> Reservado · <span className="text-destructive">■</span> Bloqueado</p>
        </CardContent></Card>
        <Card><CardContent className="space-y-4 p-4 md:p-6"><h2 className="text-lg font-semibold">Bloquear datas deste quarto</h2><div className="grid gap-3 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="block-start">Desde</Label><Input id="block-start" type="date" value={start} onChange={e => setStart(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="block-end">Até (exclusivo)</Label><Input id="block-end" type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="block-reason">Motivo</Label><Input id="block-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Manutenção, uso privado…" /></div></div><Button onClick={addBlock} disabled={saving}>Bloquear período</Button>
          {blocks.filter(b => b.quarto_id === active).map(b => <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><span>{b.data_inicio} → {b.data_fim} · {b.motivo || "Sem motivo"}</span><Button size="icon" variant="ghost" aria-label="Remover bloqueio" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button></div>)}
        </CardContent></Card>
      </>}
  </div>
}
