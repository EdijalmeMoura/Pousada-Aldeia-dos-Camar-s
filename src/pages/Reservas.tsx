import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { pt as ptPT } from "date-fns/locale"
import { CalendarCheck, CreditCard, FileText, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { dbDelete, dbInsert, dbList, dbUpdate, logActivity, type Quarto, type Reserva } from "@/lib/db"
import { waLink, supabase } from "@/lib/supabase"
import { paymentMessage } from "@/lib/manualPayment"
import { bookingDates, quotePublicBooking } from "@/lib/publicBooking"
import { brl, uid, useSeo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"
import { ReservationExport } from "@/components/ReservationExport"
import { ReservationCancellation } from "@/components/ReservationCancellation"

const schema = z.object({
  quarto_id: z.string().min(1, "Escolha o quarto"),
  nome_hospede: z.string().min(2, "Indique o nome do hóspede"),
  email: z.string().email("Indique um e-mail válido"),
  telefone: z.string().min(10, "Indique o telefone com DDD"),
  check_in: z.string().min(1, "Data de entrada obrigatória"),
  check_out: z.string().min(1, "Data de saída obrigatória"),
  adultos: z.coerce.number().min(1, "Pelo menos 1 adulto"),
  metodo_pagamento: z.enum(["pix", "cartao"]),
  origem: z.enum(["direta", "plataforma"]),
})
type Form = z.infer<typeof schema>

const estadoLabel: Record<Reserva["estado"], string> = { pendente: "Pendente", confirmada: "Confirmada", cancelada: "Cancelada", concluida: "Concluída" }

export default function Reservas() {
  useSeo("Reservas — Hospedaê", "Gira reservas diretas e de plataforma, confirme pagamentos e contacte hóspedes no WhatsApp.")
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const quartosQ = useQuery({ queryKey: ["quartos", user!.id], queryFn: () => dbList<Quarto>("quartos", user!.id) })
  const reservasQ = useQuery({ queryKey: ["reservas", user!.id], queryFn: () => dbList<Reserva>("reservas", user!.id) })
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { metodo_pagamento: "pix", origem: "direta", adultos: 2 } })

  const create = useMutation({
    mutationFn: async (data: Form) => {
      const q = (quartosQ.data ?? []).find((x) => x.id === data.quarto_id)
      if (!q || !q.ativo) throw new Error("Escolha um quarto ativo.")
      bookingDates(data, q.capacidade)
      if (supabase) {
        const { data: result, error } = await supabase.rpc("criar_reserva_proprietario", {
          p_quarto_id: q.id, p_nome: data.nome_hospede, p_email: data.email,
          p_telefone: data.telefone, p_entrada: data.check_in, p_saida: data.check_out,
          p_adultos: data.adultos, p_metodo: data.metodo_pagamento, p_origem: data.origem,
        })
        if (error) throw error
        return { codigo_reserva: result.codigo_reserva, nome_hospede: data.nome_hospede }
      }
      const quote = await quotePublicBooking(profile!.slug, user!.id, q, data)
      const r = await dbInsert<Reserva>("reservas", {
        id: uid(), user_id: user!.id, ...data, estado: "pendente", valor_total: quote.valor_total,
        codigo_reserva: "HSP-" + uid().replace(/-/g, "").slice(0, 10).toUpperCase(),
      })
      return r
    },
    onSuccess: async (r) => {
      await logActivity(user!.id, "reserva", `Reserva ${r.codigo_reserva} criada para ${r.nome_hospede}`)
      toast.success(`Reserva ${r.codigo_reserva} criada! Envie o link de pagamento ao hóspede.`)
      qc.invalidateQueries({ queryKey: ["reservas"] }); setOpen(false); form.reset({ metodo_pagamento: "pix", origem: "direta", adultos: 2 })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível criar a reserva."),
  })

  const setEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: Reserva["estado"] }) => dbUpdate<Reserva>("reservas", id, { estado }),
    onSuccess: async (_d, v) => { await logActivity(user!.id, "reserva", `Reserva atualizada para "${v.estado}"`); toast.success("Estado da reserva atualizado!"); qc.invalidateQueries({ queryKey: ["reservas"] }) },
    onError: () => toast.error("Não foi possível atualizar a reserva."),
  })

  const checkout = useMutation({
    mutationFn: async (reserva_id: string) => {
      if (!supabase) throw new Error("Ative o Supabase para usar o checkout.")
      const { data, error } = await supabase.functions.invoke("infinitepay-checkout", { body: { reserva_id } })
      if (error || !data?.url) throw new Error(data?.error || "Não foi possível gerar o link. Verifique a configuração da InfinitePay.")
      return data.url as string
    },
    onSuccess: async (url) => {
      await navigator.clipboard.writeText(url)
      toast.success("Link copiado. Envie-o ao hóspede e aguarde a confirmação do pagamento.")
      qc.invalidateQueries({ queryKey: ["reservas"] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao criar o link."),
  })

  const del = useMutation({
    mutationFn: (id: string) => {
      const r = (reservasQ.data ?? []).find(x => x.id === id)
      if (r?.pagamento_estado === "pago") throw new Error("Não é possível eliminar uma reserva paga. Mantenha o histórico para reconciliação.")
      return dbDelete("reservas", id)
    },
    onSuccess: () => { toast.success("Reserva removida."); qc.invalidateQueries({ queryKey: ["reservas"] }) },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível remover a reserva."),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Reservas</h1><p className="text-sm text-muted-foreground">Envie a cobrança ao hóspede e confirme a reserva após verificar o pagamento.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nova reserva</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova reserva</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="quarto_id">Quarto</Label>
                <select id="quarto_id" {...form.register("quarto_id")} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Escolha o quarto…</option>{(quartosQ.data ?? []).map((q) => <option key={q.id} value={q.id}>{q.nome}</option>)}
                </select>{form.formState.errors.quarto_id && <p className="text-sm text-destructive">{form.formState.errors.quarto_id.message}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="nome_hospede">Hóspede</Label><Input id="nome_hospede" {...form.register("nome_hospede")} placeholder="Nome completo" />{form.formState.errors.nome_hospede && <p className="text-sm text-destructive">{form.formState.errors.nome_hospede.message}</p>}</div>
                <div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" {...form.register("telefone")} placeholder="81987654321" inputMode="numeric" />{form.formState.errors.telefone && <p className="text-sm text-destructive">{form.formState.errors.telefone.message}</p>}</div>
              </div>
              <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" {...form.register("email")} placeholder="hospede@email.com" />{form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="check_in">Entrada</Label><Input id="check_in" type="date" {...form.register("check_in")} /></div>
                <div className="space-y-2"><Label htmlFor="check_out">Saída</Label><Input id="check_out" type="date" {...form.register("check_out")} /></div>
                <div className="space-y-2"><Label htmlFor="adultos">Adultos</Label><Input id="adultos" type="number" {...form.register("adultos")} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="metodo_pagamento">Pagamento</Label>
                  <select id="metodo_pagamento" {...form.register("metodo_pagamento")} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"><option value="pix">PIX</option><option value="cartao">Cartão</option></select>
                </div>
                <div className="space-y-2"><Label htmlFor="origem">Origem</Label>
                  <select id="origem" {...form.register("origem")} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"><option value="direta">Direta (sem comissão)</option><option value="plataforma">Plataforma</option></select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Criar reserva</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ReservationExport rows={reservasQ.data ?? []} />
      <Card>
        <CardContent className="p-0 md:p-2">
          {reservasQ.isLoading ? <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            : (reservasQ.data ?? []).length === 0 ? <EmptyState icon={CalendarCheck} titulo="Sem reservas ainda" subtitulo="Crie a primeira reserva ou partilhe o link direto com os seus hóspedes." cta="Nova reserva" onCta={() => setOpen(true)} />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Hóspede</TableHead><TableHead>Período</TableHead><TableHead>Origem</TableHead><TableHead>Estado</TableHead><TableHead>Pagamento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(reservasQ.data ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.codigo_reserva}</TableCell>
                        <TableCell>{r.nome_hospede}<br /><span className="text-xs text-muted-foreground">{r.telefone}</span></TableCell>
                        <TableCell className="whitespace-nowrap">{format(parseISO(r.check_in), "d MMM", { locale: ptPT })} → {format(parseISO(r.check_out), "d MMM", { locale: ptPT })}</TableCell>
                        <TableCell><Badge variant={r.origem === "direta" ? "default" : "outline"}>{r.origem === "direta" ? "Direta" : "Plataforma"}</Badge></TableCell>
                        <TableCell>
                          <select aria-label="Estado da reserva" value={r.estado} disabled={r.estado === "cancelada" || r.estado === "concluida" || setEstado.isPending} onChange={(e) => setEstado.mutate({ id: r.id, estado: e.target.value as Reserva["estado"] })} className="rounded-xl border border-input bg-background px-2 py-1 text-sm">
                            {(Object.keys(estadoLabel) as Reserva["estado"][]).filter(s => s !== "cancelada" || r.estado === "cancelada").map((s) => <option key={s} value={s}>{estadoLabel[s]}</option>)}
                          </select>
                        </TableCell>
                        <TableCell><Badge variant={r.pagamento_estado === "pago" ? "default" : "outline"}>{r.pagamento_estado === "pago" ? "Pago (verificado)" : r.pagamento_estado === "aguarda_pagamento" ? "A aguardar" : "Não pago"}</Badge>{r.reembolso_estado === "requer_analise" && <span className="mt-1 block text-xs text-destructive">Reembolso por analisar</span>}{r.reembolso_estado === "registado_manual" && <span className="mt-1 block text-xs text-muted-foreground">Reembolso registado manualmente</span>}{r.estado === "cancelada" && r.motivo_cancelamento && <span className="mt-1 block max-w-48 truncate text-xs text-muted-foreground" title={r.motivo_cancelamento}>Motivo: {r.motivo_cancelamento}</span>}</TableCell>
                        <TableCell className="text-right font-medium">{brl(r.valor_total)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <ReservationCancellation reservation={r} ownerId={user!.id} onChanged={() => qc.invalidateQueries({ queryKey: ["reservas"] })} />
                            {["confirmada", "concluida"].includes(r.estado) && <Button variant="ghost" size="icon" aria-label="Ver confirmação de estadia" title="Ver confirmação de estadia" asChild><Link to={`/app/reservas/${r.id}/confirmacao`}><FileText className="h-4 w-4 text-primary" /></Link></Button>}
                            {profile?.infinitepay_handle && r.pagamento_estado !== "pago" && <Button variant="ghost" size="icon" aria-label="Copiar link InfinitePay" disabled={checkout.isPending} onClick={() => checkout.mutate(r.id)}><CreditCard className="h-4 w-4 text-primary" /></Button>}
                            <Button variant="ghost" size="icon" aria-label="Enviar dados de pagamento ao hóspede por WhatsApp" asChild>
                              <a href={waLink(r.telefone, paymentMessage(r, { nome_pousada: profile?.nome_pousada || "Pousada", chave_pix: profile?.chave_pix || "", link_pagamento: profile?.link_pagamento || "" }))} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-primary" /></a>
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Remover reserva" disabled={r.pagamento_estado === "pago" || del.isPending} title={r.pagamento_estado === "pago" ? "Reservas pagas não podem ser removidas" : "Remover reserva"} onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
