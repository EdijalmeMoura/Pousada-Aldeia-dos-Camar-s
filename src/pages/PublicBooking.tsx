import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { BedDouble, CalendarCheck, Check, Loader2, ShieldCheck, Users } from "lucide-react"
import { publicPousada, publicQuartos, createPublicBooking, quotePublicBooking, type PublicQuarto } from "@/lib/publicBooking"
import { brl, useSeo } from "@/lib/utils"
import { publicBookingSchema, type PublicBookingForm } from "@/lib/bookingValidation"
import { isSupabaseConfigured } from "@/lib/supabase"
import { isPhpBackend } from "@/lib/phpBackend"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"
import { RoomPhoto } from "@/components/RoomPhoto"

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<PublicQuarto | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const profileQ = useQuery({ queryKey: ["public-profile", slug], queryFn: () => publicPousada(slug!) })
  const quartosQ = useQuery({
    queryKey: ["public-quartos", profileQ.data?.id],
    queryFn: () => publicQuartos(slug!, profileQ.data!.id),
    enabled: Boolean(profileQ.data),
  })
  useSeo(profileQ.data ? `${profileQ.data.nome_pousada} — Reserve direto sem taxa` : "Reserva direta", "Reserve direto na pousada sem taxa de plataforma. Seleção de PIX ou cartão; pagamento sujeito à confirmação da pousada.")

  const form = useForm<PublicBookingForm>({ resolver: zodResolver(publicBookingSchema), defaultValues: { metodo_pagamento: "pix", adultos: 2, aceito_privacidade: false } })

  const today = isPhpBackend ? profileQ.data?.today : new Date().toISOString().slice(0, 10)
  const entrada = form.watch("check_in")
  const saida = form.watch("check_out")
  const adultos = form.watch("adultos")
  const quoteQ = useQuery({
    queryKey: ["cotacao", slug, selected?.id, entrada, saida, adultos],
    queryFn: () => quotePublicBooking(slug!, profileQ.data!.id, selected!, { check_in: entrada, check_out: saida, adultos }, today),
    enabled: Boolean(selected && profileQ.data && entrada && saida && adultos),
    retry: false,
  })

  const book = useMutation({
    mutationFn: async (data: PublicBookingForm) => {
      return createPublicBooking(slug!, profileQ.data!.id, selected!, data, today)
    },
    onSuccess: (r) => {
      setDone(`${r.codigo_reserva} · ${brl(r.valor_total)}`)
      toast.success("Reserva registada! A pousada confirma em instantes.")
      qc.invalidateQueries({ queryKey: ["reservas"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível registar a reserva."),
  })

  if (profileQ.isLoading) return <div className="mx-auto max-w-7xl space-y-4 p-4"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>
  if (profileQ.isError) return <div className="mx-auto max-w-7xl p-4 text-center">Não foi possível carregar a pousada. <Button onClick={() => profileQ.refetch()}>Tentar novamente</Button></div>
  if (!profileQ.data) return (
    <div className="mx-auto max-w-7xl p-4"><Card><CardContent><EmptyState icon={BedDouble} titulo="Pousada não encontrada" subtitulo="Verifique o link e tente novamente." /></CardContent></Card></div>
  )

  const p = profileQ.data
  const quartos = (quartosQ.data ?? []).filter((q) => q.ativo)

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <span className="flex items-center gap-2 font-bold"><span className="bg-hero-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white"><BedDouble className="h-4 w-4" /></span>{p.nome_pousada || "Pousada"}</span>
          <Badge variant="secondary">Reserva direta · Sem taxa</Badge>
        </div>
      </header>

      <section className="relative pt-16">
        <div className="relative h-64 overflow-hidden md:h-80">
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 text-white md:px-6">
            <h1 className="text-3xl font-bold md:text-4xl">{p.nome_pousada || "Pousada"}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-white/85">Reserve diretamente, sem intermediários</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {!isSupabaseConfigured && !isPhpBackend && <p role="status" className="mb-6 rounded-xl border border-border bg-accent px-4 py-3 text-sm">Modo de demonstração: as reservas são guardadas apenas neste navegador e não são partilhadas com a pousada.</p>}
        {done ? (
          <Card className="animate-fade-up mx-auto max-w-lg shadow-lg"><CardContent className="space-y-4 p-8 text-center">
            <span className="bg-hero-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"><Check className="h-8 w-8" /></span>
            <h2 className="text-2xl font-bold">Reserva registada!</h2>
            <p className="text-muted-foreground">Referência <strong>{done}</strong>. Sem taxa de plataforma — a pousada entrará em contacto para combinar o pagamento. Não foi efetuada qualquer cobrança.</p>
            <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Reserva direta, margem toda da pousada.</p>
          </CardContent></Card>
        ) : !selected ? (
          <div className="space-y-6">
            <div className="text-center"><h2 className="text-2xl font-bold md:text-3xl">Escolha o seu quarto</h2><p className="mt-2 text-muted-foreground">Preços diretos, sem intermediários.</p></div>
            {quartosQ.isLoading ? <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
              : quartosQ.isError ? <p role="alert" className="text-center">Não foi possível carregar os quartos. <Button onClick={() => quartosQ.refetch()}>Tentar novamente</Button></p>
              : quartos.length === 0 ? <Card><CardContent><EmptyState icon={CalendarCheck} titulo="Sem quartos disponíveis" subtitulo="Volte em breve — a pousada está a atualizar o calendário." /></CardContent></Card>
              : (
                <div className="grid gap-6 md:grid-cols-3">
                  {quartos.map((q, i) => (
                    <Card key={q.id} className="animate-fade-up group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="relative h-48 overflow-hidden">
                        <RoomPhoto src={q.foto_url} name={q.nome} className="h-full transition-transform duration-500 group-hover:scale-105" />
                        <Badge className="absolute left-3 top-3 border-white/30 bg-black/40 text-white backdrop-blur">Direto · sem taxa</Badge>
                      </div>
                      <CardContent className="space-y-3 p-5">
                        <h3 className="text-lg font-semibold">{q.nome}</h3>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{q.descricao}</p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Até {q.capacidade} pessoa(s)</p>
                        {q.comodidades && <p className="text-xs text-muted-foreground">{q.comodidades}</p>}
                        <div className="flex items-center justify-between border-t pt-3">
                          <span className="text-xl font-bold text-primary">{brl(q.preco_base)}<span className="text-sm font-normal text-muted-foreground">/noite</span></span>
                          <Button onClick={() => setSelected(q)}>Reservar</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="overflow-hidden lg:col-span-2">
              <RoomPhoto src={selected.foto_url} name={selected.nome} className="h-56" />
              <CardContent className="space-y-2 p-5">
                <h2 className="text-xl font-bold">{selected.nome}</h2>
                <p className="text-sm text-muted-foreground">{selected.descricao}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Até {selected.capacidade} pessoa(s)</p>
                <p className="text-lg font-bold text-primary">{brl(selected.preco_base)}/noite</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg lg:col-span-3">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Finalizar reserva</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Trocar quarto</Button>
                </div>
                <form onSubmit={form.handleSubmit((d) => book.mutate(d))} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="nome_hospede">O seu nome</Label><Input id="nome_hospede" {...form.register("nome_hospede")} placeholder="Nome completo" />{form.formState.errors.nome_hospede && <p className="text-sm text-destructive">{form.formState.errors.nome_hospede.message}</p>}</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" {...form.register("email")} />{form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}</div>
                    <div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" {...form.register("telefone")} placeholder="81987654321" inputMode="numeric" />{form.formState.errors.telefone && <p className="text-sm text-destructive">{form.formState.errors.telefone.message}</p>}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2"><Label htmlFor="check_in">Entrada</Label><Input id="check_in" type="date" min={today} aria-invalid={Boolean(form.formState.errors.check_in)} {...form.register("check_in")} />{form.formState.errors.check_in && <p role="alert" className="text-sm text-destructive">{form.formState.errors.check_in.message}</p>}</div>
                    <div className="space-y-2"><Label htmlFor="check_out">Saída</Label><Input id="check_out" type="date" min={form.watch("check_in") || today} aria-invalid={Boolean(form.formState.errors.check_out)} {...form.register("check_out")} />{form.formState.errors.check_out && <p role="alert" className="text-sm text-destructive">{form.formState.errors.check_out.message}</p>}</div>
                    <div className="space-y-2"><Label htmlFor="adultos">Adultos</Label><Input id="adultos" type="number" min={1} max={selected.capacidade} aria-invalid={Boolean(form.formState.errors.adultos)} {...form.register("adultos")} />{form.formState.errors.adultos && <p role="alert" className="text-sm text-destructive">{form.formState.errors.adultos.message}</p>}</div>
                  </div>
                  {Number(adultos) > selected.capacidade && <p role="alert" className="text-sm text-destructive">Este quarto aceita até {selected.capacidade} pessoa(s).</p>}
                  <div className="space-y-2"><Label htmlFor="metodo_pagamento">Pagamento</Label>
                    <select id="metodo_pagamento" {...form.register("metodo_pagamento")} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"><option value="pix">PIX</option><option value="cartao">Cartão</option></select>
                  </div>
                  {(!entrada || !saida) && <p role="status" className="text-sm text-muted-foreground">Escolha as datas de entrada e saída para verificar a disponibilidade e ver o total.</p>}
                  {quoteQ.isFetching && <p className="text-center text-sm text-muted-foreground">A verificar disponibilidade e tarifa…</p>}
                  {quoteQ.isError && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">{quoteQ.error instanceof Error ? quoteQ.error.message : "Não foi possível consultar a tarifa."}</p>}
                  {quoteQ.data && <p className="rounded-xl bg-accent p-3 text-center text-sm font-medium">{quoteQ.data.noites} noite(s) · Total: <strong>{brl(quoteQ.data.valor_total)}</strong> (sem taxa de plataforma)</p>}
                  <label className="flex items-start gap-2 text-sm"><input type="checkbox" {...form.register("aceito_privacidade")} className="mt-1" /> <span>Li e aceito os <Link to="/termos" target="_blank" rel="noreferrer" className="text-primary underline">Termos</Link> e a <Link to="/privacidade" target="_blank" rel="noreferrer" className="text-primary underline">Política de privacidade</Link> para esta reserva.</span></label>
                  {form.formState.errors.aceito_privacidade && <p role="alert" className="text-sm text-destructive">{form.formState.errors.aceito_privacidade.message}</p>}
                  <Button type="submit" className="w-full" disabled={book.isPending || !quoteQ.data || quoteQ.isFetching || Number(adultos) > selected.capacidade}>{book.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar reserva direta</Button>
                  <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Sem cobrança online · Pagamento combinado com a pousada</p>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
