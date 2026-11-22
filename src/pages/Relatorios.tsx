import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart3, BedDouble, CalendarCheck, CreditCard, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { dbList, type Bloqueio, type Quarto, type Reserva } from "@/lib/db"
import { monthlyReport } from "@/lib/reports"
import { brl, useSeo } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"

export default function Relatorios() {
  useSeo("Relatórios — Hospedaê", "Ocupação mensal, reservas e pagamentos verificados da sua pousada.")
  const { user } = useAuth()
  const owner = user!.id
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const roomsQ = useQuery({ queryKey: ["quartos", owner], queryFn: () => dbList<Quarto>("quartos", owner) })
  const bookingsQ = useQuery({ queryKey: ["reservas", owner], queryFn: () => dbList<Reserva>("reservas", owner) })
  const blocksQ = useQuery({ queryKey: ["bloqueios", owner], queryFn: () => dbList<Bloqueio>("bloqueios", owner) })
  const loading = roomsQ.isLoading || bookingsQ.isLoading || blocksQ.isLoading
  const error = roomsQ.isError || bookingsQ.isError || blocksQ.isError
  const report = !loading && !error && month ? monthlyReport(month, roomsQ.data ?? [], bookingsQ.data ?? [], blocksQ.data ?? []) : null
  const values = report ? [
    { label: "Reservas com entrada no mês", value: String(report.total), icon: CalendarCheck },
    { label: "Ocupação", value: `${report.occupancy}%`, icon: BedDouble },
    { label: "Valor reservado", value: brl(report.bookedValue), icon: Wallet },
    { label: "Pagamentos verificados", value: brl(report.verifiedValue), icon: CreditCard },
  ] : []
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Relatórios</h1><p className="text-sm text-muted-foreground">Dados da sua pousada, sem estimativas apresentadas como receita recebida.</p></div>
    <div className="max-w-xs space-y-2"><Label htmlFor="report-month">Mês de referência</Label><Input id="report-month" type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
    {loading ? <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      : error ? <p role="alert">Não foi possível carregar os relatórios. <Button onClick={() => { roomsQ.refetch(); bookingsQ.refetch(); blocksQ.refetch() }}>Tentar novamente</Button></p>
      : !report || !(roomsQ.data ?? []).length ? <Card><CardContent><EmptyState icon={BarChart3} titulo="Sem dados para analisar" subtitulo="Cadastre um quarto para acompanhar ocupação e reservas." /></CardContent></Card>
      : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{values.map(item => <Card key={item.label}><CardContent className="flex items-center gap-4 p-5"><span className="rounded-xl bg-primary/10 p-3 text-primary"><item.icon className="h-5 w-5" /></span><div><p className="text-2xl font-bold">{item.value}</p><p className="text-sm text-muted-foreground">{item.label}</p></div></CardContent></Card>)}</div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-semibold">Origem e estado</h2><Line label="Reservas diretas (não canceladas)" value={report.direct} /><Line label="Reservas de plataforma (não canceladas)" value={report.platform} /><Line label="Pendentes" value={report.pending} /><Line label="Canceladas" value={report.canceled} /></CardContent></Card>
          <Card><CardContent className="space-y-3 p-5"><h2 className="font-semibold">Noites de quarto</h2><Line label="Disponíveis (sem bloqueios)" value={report.availableNights} /><Line label="Ocupadas (confirmadas/concluídas)" value={report.occupiedNights} /><p className="text-xs text-muted-foreground">A ocupação conta noites dentro do mês, mesmo de estadias iniciadas antes. O valor reservado e os pagamentos verificados são atribuídos ao mês de entrada da reserva; não representam necessariamente o fluxo de caixa do mês.</p></CardContent></Card>
        </div>
      </>}
  </div>
}

function Line({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4 border-b pb-2 text-sm"><span className="text-muted-foreground">{label}</span><strong>{value}</strong></div>
}
