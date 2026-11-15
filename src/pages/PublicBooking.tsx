import { useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { BedDouble, CalendarCheck, Check, Loader2, ShieldCheck, Star, Users } from "lucide-react"
import { dbInsert, dbList, getProfileBySlug, logActivity, type Quarto, type Reserva } from "@/lib/db"
import { brl, uid, useSeo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"

const schema = z.object({
  nome_hospede: z.string().min(2, "Indique o seu nome"),
  email: z.string().email("Indique um e-mail válido"),
  telefone: z.string().min(10, "Indique o telefone com DDD"),
  check_in: z.string().min(1, "Escolha a data de entrada"),
  check_out: z.string().min(1, "Escolha a data de saída"),
  adultos: z.coerce.number().min(1, "Pelo menos 1 adulto"),
  metodo_pagamento: z.enum(["pix", "cartao"]),
})
type Form = z.infer<typeof schema>

const fallbackImg = ["/images/quarto-1.jpg", "/images/quarto-2.jpg", "/images/quarto-3.jpg"]

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Quarto | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const profileQ = useQuery({ queryKey: ["public-profile", slug], queryFn: () => getProfileBySlug(slug!) })
  const quartosQ = useQuery({
    queryKey: ["public-quartos", profileQ.data?.id],
    queryFn: () => dbList<Quarto>("quartos", profileQ.data!.id),
    enabled: Boolean(profileQ.data),
  })
  useSeo(profileQ.data ? `${profileQ.data.nome_pousada} — Reserve direto sem taxa` : "Reserva direta", "Reserve direto na pousada sem taxa de plataforma. Pagamento PIX ou cartão.")

  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { metodo_pagamento: "pix", adultos: 2 } })

  const book = useMutation({
    mutationFn: async (data: Form) => {
      const noites = Math.max(1, Math.round((new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / 864e5))
      return dbInsert<Reserva>("reservas", {
        id: uid(), user_id: profileQ.data!.id, quarto_id: selected!.id, ...data,
        estado: "pendente", valor_total: selected!.preco_base * noites,
        codigo_reserva: "ADC-" + Math.random().toString(36).slice(2, 8).toUpperCase(), origem: "direta",
      })
    },
    onSuccess: async (r) => {
      await logActivity(profileQ.data!.id, "reserva", `Reserva direta ${r.codigo_reserva} de ${r.nome_hospede}`)
      setDone(r.codigo_reserva)
      toast.success("Reserva registada! A pousada confirma em instantes.")
      qc.invalidateQueries({ queryKey: ["reservas"] })
    },
    onError: () => toast.error("Não foi possível registar a reserva. Tente novamente."),
  })

  if (profileQ.isLoading) return <div className="mx-auto max-w-7xl space-y-4 p-4"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>
  if (!profileQ.data) return (
    <div className="mx-auto max-w-7xl p-4"><Card><CardContent><EmptyState icon={BedDouble} titulo="Pousada não encontrada" subtitulo="Verifique o link e tente novamente." /></CardContent></Card></div>
  )

  const p = profileQ.data
  const quartos = (quartosQ.data ?? []).filter((q) => q.ativo)
  const noites = form.watch("check_in") && form.watch("check_out") ? Math.max(1, Math.round((new Date(form.watch("check_out")).getTime() - new Date(form.watch("check_in")).getTime()) / 864e5)) : 0

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <span className="flex items-center gap-2 font-bold"><span className="bg-hero-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white"><BedDouble className="h-4 w-4" /></span>{p.nome_pousada || "Pousada"}</span>
          <Badge variant="secondary"><Star className="mr-1 h-3 w-3 fill-current" /> Reserva direta · Sem taxa</Badge>
        </div>
      </header>

      <section className="relative pt-16">
        <div className="relative h-64 overflow-hidden md:h-80">
          <img src="/images/hero.jpg" alt={`Vista da ${p.nome_pousada || "pousada"}`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 text-white md:px-6">
            <h1 className="text-3xl font-bold md:text-4xl">{p.nome_pousada || "Pousada"}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-white/85"><Star className="h-4 w-4 fill-current" /> 4,9 · Reserve direto e poupe 15–20% de comissão</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {done ? (
          <Card className="animate-fade-up mx-auto max-w-lg shadow-lg"><CardContent className="space-y-4 p-8 text-center">
            <span className="bg-hero-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"><Check className="h-8 w-8" /></span>
            <h2 className="text-2xl font-bold">Reserva registada!</h2>
            <p className="text-muted-foreground">Código <strong>{done}</strong>. Sem taxa de plataforma — pague por PIX ou cartão quando a pousada confirmar.</p>
            <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Reserva direta, margem toda da pousada.</p>
          </CardContent></Card>
        ) : !selected ? (
          <div className="space-y-6">
            <div className="text-center"><h2 className="text-2xl font-bold md:text-3xl">Escolha o seu quarto</h2><p className="mt-2 text-muted-foreground">Preços diretos, sem intermediários.</p></div>
            {quartosQ.isLoading ? <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
              : quartos.length === 0 ? <Card><CardContent><EmptyState icon={CalendarCheck} titulo="Sem quartos disponíveis" subtitulo="Volte em breve — a pousada está a atualizar o calendário." /></CardContent></Card>
              : (
                <div className="grid gap-6 md:grid-cols-3">
                  {quartos.map((q, i) => (
                    <Card key={q.id} className="animate-fade-up group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="relative h-48 overflow-hidden">
                        <img src={q.foto_url || fallbackImg[i % 3]} alt={q.nome} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
              <img src={selected.foto_url || "/images/quarto-1.jpg"} alt={selected.nome} className="h-56 w-full object-cover" />
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" {...form.register("email")} />{form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}</div>
                    <div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" {...form.register("telefone")} placeholder="81987654321" inputMode="numeric" />{form.formState.errors.telefone && <p className="text-sm text-destructive">{form.formState.errors.telefone.message}</p>}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label htmlFor="check_in">Entrada</Label><Input id="check_in" type="date" {...form.register("check_in")} /></div>
                    <div className="space-y-2"><Label htmlFor="check_out">Saída</Label><Input id="check_out" type="date" {...form.register("check_out")} /></div>
                    <div className="space-y-2"><Label htmlFor="adultos">Adultos</Label><Input id="adultos" type="number" {...form.register("adultos")} /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="metodo_pagamento">Pagamento</Label>
                    <select id="metodo_pagamento" {...form.register("metodo_pagamento")} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm"><option value="pix">PIX</option><option value="cartao">Cartão</option></select>
                  </div>
                  {noites > 0 && <p className="rounded-xl bg-accent p-3 text-center text-sm font-medium">{noites} noite(s) · Total: <strong>{brl(selected.preco_base * noites)}</strong> (sem taxa de plataforma)</p>}
                  <Button type="submit" className="w-full" disabled={book.isPending}>{book.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar reserva direta</Button>
                  <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Sem comissão · Confirmação pela pousada</p>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
