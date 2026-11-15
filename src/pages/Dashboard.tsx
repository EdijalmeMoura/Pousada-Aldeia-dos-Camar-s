import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { format, isToday, parseISO } from "date-fns"
import { pt as ptPT } from "date-fns/locale"
import { Activity, BedDouble, CalendarCheck, MessageSquareText, Plus, Wallet, ArrowRight } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { dbList, type Atividade, type Reserva } from "@/lib/db"
import { brl, useSeo } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"

export default function Dashboard() {
  useSeo("Painel — Aldeia dos Camarás", "Acompanhe reservas, receita e check-ins do dia na sua pousada.")
  const { user } = useAuth()
  const uid = user!.id

  const reservasQ = useQuery({ queryKey: ["reservas", uid], queryFn: () => dbList<Reserva>("reservas", uid) })
  const atividadesQ = useQuery({ queryKey: ["atividades", uid], queryFn: () => dbList<Atividade>("atividades", uid) })
  const quartosQ = useQuery({ queryKey: ["quartos", uid], queryFn: () => dbList("quartos", uid) })

  const reservas = reservasQ.data ?? []
  const hoje = reservas.filter((r) => isToday(parseISO(r.check_in)))
  const receitaMes = reservas.filter((r) => r.estado !== "cancelada" && parseISO(r.created_at).getMonth() === new Date().getMonth()).reduce((s, r) => s + r.valor_total, 0)
  const diretas = reservas.filter((r) => r.origem === "direta" && r.estado !== "cancelada").length
  const pendentes = reservas.filter((r) => r.estado === "pendente").length

  const kpis = [
    { icon: CalendarCheck, label: "Check-ins hoje", valor: String(hoje.length), sub: `${pendentes} pendente(s)` },
    { icon: Wallet, label: "Receita do mês", valor: brl(receitaMes), sub: `${reservas.length} reservas no total` },
    { icon: BedDouble, label: "Quartos ativos", valor: String((quartosQ.data ?? []).filter((q: any) => q.ativo).length), sub: "prontos para reserva direta" },
    { icon: MessageSquareText, label: "Reservas diretas", valor: String(diretas), sub: "sem comissão de plataforma" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bom dia! 👋</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptPT })} — aqui está o resumo da sua pousada.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/app/quartos"><Plus className="h-4 w-4" /> Novo quarto</Link></Button>
          <Button asChild><Link to="/app/reservas">Nova reserva <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reservasQ.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : kpis.map((k) => (
          <Card key={k.label}><CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary"><k.icon className="h-6 w-6" /></span>
            <div><p className="text-2xl font-bold">{k.valor}</p><p className="text-sm font-medium">{k.label}</p><p className="text-xs text-muted-foreground">{k.sub}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Últimas reservas</CardTitle></CardHeader>
          <CardContent>
            {reservasQ.isLoading ? <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
              : reservas.length === 0 ? <EmptyState icon={CalendarCheck} titulo="Ainda sem reservas" subtitulo="Partilhe o seu link direto e receba a primeira reserva sem comissão." cta="Ver link público" onCta={() => {}} />
              : (
                <Table>
                  <TableHeader><TableRow><TableHead>Hóspede</TableHead><TableHead>Entrada</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {reservas.slice(0, 5).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.nome_hospede}</TableCell>
                        <TableCell>{format(parseISO(r.check_in), "d MMM", { locale: ptPT })}</TableCell>
                        <TableCell><Badge variant={r.estado === "confirmada" ? "default" : r.estado === "cancelada" ? "destructive" : "secondary"}>{r.estado}</Badge></TableCell>
                        <TableCell className="text-right">{brl(r.valor_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Atividade recente</CardTitle></CardHeader>
          <CardContent>
            {atividadesQ.isLoading ? <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
              : (atividadesQ.data ?? []).length === 0 ? <EmptyState icon={Activity} titulo="Sem atividade ainda" subtitulo="As suas ações — reservas, check-ins e cobranças — aparecem aqui." />
              : (
                <ul className="space-y-3">
                  {(atividadesQ.data ?? []).slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 rounded-xl border p-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div><p className="text-sm">{a.descricao}</p><p className="text-xs text-muted-foreground">{format(parseISO(a.created_at), "d MMM, HH:mm", { locale: ptPT })}</p></div>
                    </li>
                  ))}
                </ul>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
