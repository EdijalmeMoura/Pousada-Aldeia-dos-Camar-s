import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { BedDouble, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { dbDelete, dbInsert, dbList, dbUpdate, logActivity, seedDemo, type Quarto, type Tarifa } from "@/lib/db"
import { brl, uid, useSeo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const quartoSchema = z.object({
  nome: z.string().min(2, "Indique o nome do quarto"),
  descricao: z.string().min(5, "Descreva o quarto"),
  capacidade: z.coerce.number().min(1, "Capacidade mínima de 1 pessoa"),
  preco_base: z.coerce.number().min(1, "Indique o preço por noite"),
  comodidades: z.string().optional(),
  foto_url: z.string().optional(),
})
type QuartoForm = z.infer<typeof quartoSchema>

const tarifaSchema = z.object({
  quarto_id: z.string().min(1, "Escolha o quarto"),
  temporada: z.string().min(2, "Nome da temporada"),
  data_inicio: z.string().min(1, "Data de início obrigatória"),
  data_fim: z.string().min(1, "Data de fim obrigatória"),
  preco_noite: z.coerce.number().min(1, "Indique o preço da temporada"),
})
type TarifaForm = z.infer<typeof tarifaSchema>

export default function Quartos() {
  useSeo("Quartos e tarifas — Aldeia dos Camarás", "Cadastre quartos e defina tarifas por temporada para o seu link direto.")
  const { user } = useAuth()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Quarto | null>(null)
  const [openQ, setOpenQ] = useState(false)
  const [openT, setOpenT] = useState(false)
  const quartosQ = useQuery({ queryKey: ["quartos", user!.id], queryFn: () => dbList<Quarto>("quartos", user!.id) })
  const tarifasQ = useQuery({ queryKey: ["tarifas", user!.id], queryFn: () => dbList<Tarifa>("tarifas", user!.id) })
  const qForm = useForm<QuartoForm>({ resolver: zodResolver(quartoSchema) })
  const tForm = useForm<TarifaForm>({ resolver: zodResolver(tarifaSchema) })

  const saveQ = useMutation({
    mutationFn: async (data: QuartoForm) => {
      if (editing) return dbUpdate<Quarto>("quartos", editing.id, { ...data, comodidades: data.comodidades ?? "", foto_url: data.foto_url ?? "" })
      return dbInsert<Quarto>("quartos", { id: uid(), user_id: user!.id, ...data, comodidades: data.comodidades ?? "", foto_url: data.foto_url ?? "", ativo: true, codigo: String(Math.floor(1000 + Math.random() * 9000)) })
    },
    onSuccess: async () => {
      await logActivity(user!.id, "quarto", editing ? `Quarto "${editing.nome}" atualizado` : "Novo quarto cadastrado")
      toast.success(editing ? "Quarto atualizado!" : "Quarto cadastrado! Já está disponível no link direto.")
      qc.invalidateQueries({ queryKey: ["quartos"] }); setOpenQ(false); setEditing(null); qForm.reset()
    },
    onError: () => toast.error("Não foi possível guardar o quarto."),
  })

  const delQ = useMutation({
    mutationFn: (id: string) => dbDelete("quartos", id),
    onSuccess: () => { toast.success("Quarto removido."); qc.invalidateQueries({ queryKey: ["quartos"] }) },
    onError: () => toast.error("Não foi possível remover o quarto."),
  })

  const saveT = useMutation({
    mutationFn: (data: TarifaForm) => dbInsert<Tarifa>("tarifas", { id: uid(), user_id: user!.id, ...data }),
    onSuccess: async () => { await logActivity(user!.id, "tarifa", "Nova tarifa de temporada criada"); toast.success("Tarifa criada! O calendário foi sincronizado."); qc.invalidateQueries({ queryKey: ["tarifas"] }); setOpenT(false); tForm.reset() },
    onError: () => toast.error("Não foi possível criar a tarifa."),
  })

  const delT = useMutation({
    mutationFn: (id: string) => dbDelete("tarifas", id),
    onSuccess: () => { toast.success("Tarifa removida."); qc.invalidateQueries({ queryKey: ["tarifas"] }) },
    onError: () => toast.error("Não foi possível remover a tarifa."),
  })

  const openEdit = (q: Quarto) => { setEditing(q); qForm.reset({ nome: q.nome, descricao: q.descricao, capacidade: q.capacidade, preco_base: q.preco_base, comodidades: q.comodidades, foto_url: q.foto_url }); setOpenQ(true) }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Quartos e tarifas</h1><p className="text-sm text-muted-foreground">Cadastre os quartos e defina preços por temporada.</p></div>
      </div>

      <Tabs defaultValue="quartos">
        <TabsList><TabsTrigger value="quartos">Quartos</TabsTrigger><TabsTrigger value="tarifas">Tarifas por temporada</TabsTrigger></TabsList>

        <TabsContent value="quartos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={openQ} onOpenChange={(o) => { setOpenQ(o); if (!o) { setEditing(null); qForm.reset() } }}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Novo quarto</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "Editar quarto" : "Novo quarto"}</DialogTitle></DialogHeader>
                <form onSubmit={qForm.handleSubmit((d) => saveQ.mutate(d))} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="nome">Nome</Label><Input id="nome" {...qForm.register("nome")} placeholder="Ex.: Quarto Maré Alta" />{qForm.formState.errors.nome && <p className="text-sm text-destructive">{qForm.formState.errors.nome.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="descricao">Descrição</Label><Textarea id="descricao" {...qForm.register("descricao")} placeholder="Vista, cama, casa de banho…" />{qForm.formState.errors.descricao && <p className="text-sm text-destructive">{qForm.formState.errors.descricao.message}</p>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="capacidade">Capacidade</Label><Input id="capacidade" type="number" {...qForm.register("capacidade")} />{qForm.formState.errors.capacidade && <p className="text-sm text-destructive">{qForm.formState.errors.capacidade.message}</p>}</div>
                    <div className="space-y-2"><Label htmlFor="preco_base">Preço/noite (R$)</Label><Input id="preco_base" type="number" step="0.01" {...qForm.register("preco_base")} />{qForm.formState.errors.preco_base && <p className="text-sm text-destructive">{qForm.formState.errors.preco_base.message}</p>}</div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="comodidades">Comodidades</Label><Input id="comodidades" {...qForm.register("comodidades")} placeholder="Wi-Fi, ar-condicionado, pequeno-almoço…" /></div>
                  <div className="space-y-2"><Label htmlFor="foto_url">URL da foto (opcional)</Label><Input id="foto_url" {...qForm.register("foto_url")} placeholder="https://…" /></div>
                  <Button type="submit" className="w-full" disabled={saveQ.isPending}>{saveQ.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar quarto</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {quartosQ.isLoading ? <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
            : (quartosQ.data ?? []).length === 0 ? <Card><CardContent><EmptyState icon={BedDouble} titulo="Nenhum quarto ainda" subtitulo="Cadastre o primeiro quarto para ativar o seu link direto de reserva — ou explore com dados de demonstração." cta="Cadastrar quarto" onCta={() => setOpenQ(true)} /><div className="flex justify-center pb-4"><Button variant="outline" onClick={async () => { await seedDemo(user!.id); toast.success("Dados de demonstração carregados!"); qc.invalidateQueries({ queryKey: ["quartos"] }); qc.invalidateQueries({ queryKey: ["reservas"] }); qc.invalidateQueries({ queryKey: ["tarifas"] }) }}><Sparkles className="h-4 w-4" /> Carregar demonstração</Button></div></CardContent></Card>
            : (
              <div className="grid gap-4 md:grid-cols-2">
                {(quartosQ.data ?? []).map((q) => (
                  <Card key={q.id}>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div><h3 className="font-semibold">{q.nome}</h3><p className="text-sm text-muted-foreground">{q.descricao}</p></div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" aria-label="Editar quarto" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" aria-label="Remover quarto" onClick={() => delQ.mutate(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-bold text-primary">{brl(q.preco_base)}/noite</span>
                        <span className="text-muted-foreground">· {q.capacidade} pessoa(s)</span>
                        <span className="text-muted-foreground">· código {q.codigo}</span>
                      </div>
                      {q.comodidades && <p className="text-xs text-muted-foreground">{q.comodidades}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{q.ativo ? "Ativo no link direto" : "Inativo"}</span>
                        <Switch checked={q.ativo} aria-label="Ativar quarto" onCheckedChange={async (v) => { await dbUpdate("quartos", q.id, { ativo: v }); toast.success(v ? "Quarto ativado!" : "Quarto desativado."); qc.invalidateQueries({ queryKey: ["quartos"] }) }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </TabsContent>

        <TabsContent value="tarifas" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={openT} onOpenChange={setOpenT}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nova tarifa</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova tarifa de temporada</DialogTitle></DialogHeader>
                <form onSubmit={tForm.handleSubmit((d) => saveT.mutate(d))} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="quarto_id">Quarto</Label>
                    <select id="quarto_id" {...tForm.register("quarto_id")} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Escolha o quarto…</option>
                      {(quartosQ.data ?? []).map((q) => <option key={q.id} value={q.id}>{q.nome}</option>)}
                    </select>{tForm.formState.errors.quarto_id && <p className="text-sm text-destructive">{tForm.formState.errors.quarto_id.message}</p>}
                  </div>
                  <div className="space-y-2"><Label htmlFor="temporada">Temporada</Label><Input id="temporada" {...tForm.register("temporada")} placeholder="Ex.: Alta estação — dezembro" />{tForm.formState.errors.temporada && <p className="text-sm text-destructive">{tForm.formState.errors.temporada.message}</p>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="data_inicio">Início</Label><Input id="data_inicio" type="date" {...tForm.register("data_inicio")} /></div>
                    <div className="space-y-2"><Label htmlFor="data_fim">Fim</Label><Input id="data_fim" type="date" {...tForm.register("data_fim")} /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="preco_noite">Preço/noite (R$)</Label><Input id="preco_noite" type="number" step="0.01" {...tForm.register("preco_noite")} />{tForm.formState.errors.preco_noite && <p className="text-sm text-destructive">{tForm.formState.errors.preco_noite.message}</p>}</div>
                  <Button type="submit" className="w-full" disabled={saveT.isPending}>{saveT.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Criar tarifa</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {tarifasQ.isLoading ? <Skeleton className="h-40" />
            : (tarifasQ.data ?? []).length === 0 ? <Card><CardContent><EmptyState icon={BedDouble} titulo="Sem tarifas de temporada" subtitulo="Crie tarifas para a alta estação e mantenha o calendário sincronizado." cta="Criar tarifa" onCta={() => setOpenT(true)} /></CardContent></Card>
            : (
              <div className="grid gap-4 md:grid-cols-2">
                {(tarifasQ.data ?? []).map((t) => {
                  const q = (quartosQ.data ?? []).find((x) => x.id === t.quarto_id)
                  return (
                    <Card key={t.id}><CardContent className="flex items-center justify-between gap-3 p-5">
                      <div><h3 className="font-semibold">{t.temporada}</h3><p className="text-sm text-muted-foreground">{q?.nome ?? "Quarto"} · {t.data_inicio} → {t.data_fim}</p><p className="mt-1 font-bold text-primary">{brl(t.preco_noite)}/noite</p></div>
                      <Button variant="ghost" size="icon" aria-label="Remover tarifa" onClick={() => delT.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </CardContent></Card>
                  )
                })}
              </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
