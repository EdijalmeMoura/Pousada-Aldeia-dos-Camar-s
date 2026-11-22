import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { phpRequest } from "@/lib/phpBackend"
import { phpWrite } from "@/lib/phpAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Room = { id: string; nome: string }
type Booking = { id: string; nome_hospede: string; codigo_reserva: string; estado: string }
type Block = { id: string; quarto_id: string; data_inicio: string; data_fim: string; motivo: string }

export function CalendarOperations({ rooms, bookings }: { rooms: Room[]; bookings: Booking[] }) {
  const qc = useQueryClient()
  const blocks = useQuery({ queryKey: ["php-blocks"], queryFn: () => phpRequest<Block[]>("my-blocks") })
  const [form, setForm] = useState({ quarto_id: "", data_inicio: "", data_fim: "", motivo: "" })
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const add = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true)
    try {
      await phpWrite("add-block", form)
      setForm({ quarto_id: "", data_inicio: "", data_fim: "", motivo: "" })
      await qc.invalidateQueries({ queryKey: ["php-blocks"] }); toast.success("Datas bloqueadas")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível bloquear as datas") }
    finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    if (!window.confirm("Remover este bloqueio?")) return
    setBusy(true)
    try { await phpWrite("remove-block", { id }); await qc.invalidateQueries({ queryKey: ["php-blocks"] }); toast.success("Bloqueio removido") }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível remover") }
    finally { setBusy(false) }
  }
  const cancel = async (id: string) => {
    if (reason.trim().length < 5) { toast.error("Indique um motivo com pelo menos 5 caracteres."); return }
    if (!window.confirm("Cancelar esta reserva? Se houve cobrança externa, analise o reembolso manualmente.")) return
    setBusy(true)
    try {
      await phpWrite("cancel-booking", { id, motivo: reason.trim() })
      setReason(""); await qc.invalidateQueries({ queryKey: ["php-bookings"] }); toast.success("Reserva cancelada; verifique se é necessário reembolso")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível cancelar") }
    finally { setBusy(false) }
  }
  return <div className="grid gap-6 lg:grid-cols-2">
    <Card><CardHeader><CardTitle>Bloquear datas</CardTitle></CardHeader><CardContent className="space-y-4">
      <form onSubmit={add} className="space-y-3">
        <Label htmlFor="block-room">Quarto</Label><select id="block-room" required value={form.quarto_id} onChange={e => setForm({ ...form, quarto_id: e.target.value })} className="flex h-10 w-full rounded-md border bg-background px-3"><option value="">Escolha um quarto</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
        <Label htmlFor="block-start">Início</Label><Input id="block-start" type="date" required value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
        <Label htmlFor="block-end">Fim (dia de saída, exclusivo)</Label><Input id="block-end" type="date" required value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} />
        <Label htmlFor="block-reason">Motivo</Label><Input id="block-reason" maxLength={200} value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} />
        <Button disabled={busy || !rooms.length}>Bloquear</Button>
      </form>
      {blocks.isError && <p role="alert">Não foi possível carregar os bloqueios. <Button variant="link" onClick={() => blocks.refetch()}>Tentar novamente</Button></p>}
      <ul className="space-y-2">{blocks.data?.map(b => <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span>{rooms.find(r => r.id === b.quarto_id)?.nome ?? "Quarto"} · {b.data_inicio} a {b.data_fim} · {b.motivo || "Sem motivo"}</span><Button variant="outline" size="sm" disabled={busy} onClick={() => remove(b.id)}>Remover</Button></li>)}</ul>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Cancelar reserva</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">O cancelamento é registado; nenhum reembolso é feito automaticamente.</p>
      <Label htmlFor="cancel-reason">Motivo do cancelamento</Label><Input id="cancel-reason" minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Descreva o motivo antes de cancelar" />
      <ul className="space-y-2">{bookings.filter(b => ["pendente", "confirmada"].includes(b.estado)).map(b => <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span>{b.codigo_reserva} · {b.nome_hospede}</span><Button variant="destructive" size="sm" disabled={busy} onClick={() => cancel(b.id)}>Cancelar</Button></li>)}</ul>
    </CardContent></Card>
  </div>
}
