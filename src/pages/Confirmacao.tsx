import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import { pt as ptPT } from "date-fns/locale"
import { ArrowLeft, Mail, MessageCircle, Printer, ShieldCheck } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { dbList, type Quarto, type Reserva } from "@/lib/db"
import { confirmationMailto, confirmationMessage } from "@/lib/guestCommunication"
import { waLink } from "@/lib/supabase"
import { brl, useSeo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Confirmacao() {
  useSeo("Confirmação de reserva — Hospedaê", "Consulte e imprima os dados de uma reserva confirmada.")
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const owner = user!.id
  const reservationsQ = useQuery({ queryKey: ["reservas", owner], queryFn: () => dbList<Reserva>("reservas", owner) })
  const roomsQ = useQuery({ queryKey: ["quartos", owner], queryFn: () => dbList<Quarto>("quartos", owner) })
  const r = reservationsQ.data?.find(x => x.id === id)
  const room = roomsQ.data?.find(x => x.id === r?.quarto_id)
  if (reservationsQ.isLoading || roomsQ.isLoading) return <Skeleton className="h-80 w-full" />
  if (reservationsQ.isError || roomsQ.isError) return <p role="alert">Não foi possível carregar a confirmação. <Button onClick={() => { reservationsQ.refetch(); roomsQ.refetch() }}>Tentar novamente</Button></p>
  if (!r || !["confirmada", "concluida"].includes(r.estado)) return <div className="space-y-4"><h1 className="text-xl font-semibold">Confirmação indisponível</h1><p className="text-muted-foreground">A reserva não existe ou ainda não foi confirmada pela pousada.</p><Button asChild><Link to="/app/reservas">Voltar às reservas</Link></Button></div>
  const pousada = profile?.nome_pousada || "Pousada"
  const message = confirmationMessage(r, pousada, room?.nome || "a definir")
  return <div className="mx-auto max-w-2xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Button variant="ghost" asChild><Link to="/app/reservas"><ArrowLeft className="h-4 w-4" /> Reservas</Link></Button><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button><Button variant="outline" asChild><a href={confirmationMailto(r.email, `Reserva ${r.codigo_reserva} confirmada`, message)}><Mail className="h-4 w-4" /> E-mail</a></Button><Button asChild><a href={waLink(r.telefone, message)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a></Button></div></div>
    <Card className="print:border-0 print:shadow-none"><CardContent className="space-y-7 p-6 md:p-10">
      <header className="border-b pb-6"><p className="text-sm font-semibold text-primary">{pousada}</p><h1 className="mt-3 text-2xl font-bold">Confirmação de estadia</h1><p className="mt-1 text-sm text-muted-foreground">Referência {r.codigo_reserva}</p></header>
      <div className="grid gap-5 sm:grid-cols-2"><Detail label="Hóspede" value={r.nome_hospede} /><Detail label="Quarto" value={room?.nome || "A definir pela pousada"} /><Detail label="Entrada" value={format(parseISO(r.check_in), "d 'de' MMMM 'de' yyyy", { locale: ptPT })} /><Detail label="Saída" value={format(parseISO(r.check_out), "d 'de' MMMM 'de' yyyy", { locale: ptPT })} /><Detail label="Adultos" value={String(r.adultos)} /><Detail label="Valor da reserva" value={brl(r.valor_total)} /></div>
      <div className="rounded-xl border p-4 text-sm"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Estado do pagamento</p><p className="mt-1 text-muted-foreground">{r.pagamento_estado === "pago" ? "Verificado na plataforma. Este documento confirma a estadia, não substitui um recibo fiscal ou comprovativo do prestador de pagamentos." : "Não verificado na plataforma. Este documento não comprova que foi efetuado um pagamento."}</p></div>
      <p className="border-t pt-5 text-xs text-muted-foreground">Confirmação gerada pela pousada. Para alterações, contacte diretamente o alojamento. O envio por e-mail ou WhatsApp é manual e só acontece depois de escolher enviar na respetiva aplicação.</p>
    </CardContent></Card>
  </div>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>
}
