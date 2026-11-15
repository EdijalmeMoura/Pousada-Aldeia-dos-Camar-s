import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { pt as ptPT } from "date-fns/locale"
import { KeyRound, Loader2, MessageSquareText, Send, Sparkles } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { dbInsert, dbList, dbUpdate, logActivity, type Checkin, type Reserva } from "@/lib/db"
import { aiGenerate, aiWelcomeMessage } from "@/lib/ai"
import { uid, useSeo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"

interface Msg { papel: "ia" | "hospede"; texto: string }

export default function Checkin() {
  useSeo("Check-in por IA — Aldeia dos Camarás", "Check-in conversacional por IA: recolha dados, envie regras e o código do quarto.")
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const reservasQ = useQuery({ queryKey: ["reservas", user!.id], queryFn: () => dbList<Reserva>("reservas", user!.id) })
  const checkinsQ = useQuery({ queryKey: ["checkins", user!.id], queryFn: () => dbList<Checkin>("checkins", user!.id) })
  const [reservaId, setReservaId] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState<Checkin | null>(null)

  const reservas = (reservasQ.data ?? []).filter((r) => r.estado === "confirmada" || r.estado === "pendente")

  const start = useMutation({
    mutationFn: async (rid: string) => {
      const r = reservas.find((x) => x.id === rid)!
      const welcome = await aiWelcomeMessage(r.nome_hospede, profile?.nome_pousada ?? "a pousada", r.codigo_reserva)
      const c = await dbInsert<Checkin>("checkins", { id: uid(), user_id: user!.id, reserva_id: rid, estado: "em_curso", dados: {}, codigo_quarto: "", regras_enviadas: false })
      return { c, welcome }
    },
    onSuccess: async ({ c, welcome }) => {
      setActive(c); setMsgs([{ papel: "ia", texto: welcome }])
      await logActivity(user!.id, "checkin", "Check-in por IA iniciado")
      toast.success("Check-in iniciado! A IA já saudou o hóspede.")
      qc.invalidateQueries({ queryKey: ["checkins"] })
    },
    onError: () => toast.error("Não foi possível iniciar o check-in."),
  })

  const send = async () => {
    const texto = input.trim()
    if (!texto || !active) return
    setInput(""); setBusy(true)
    const next = [...msgs, { papel: "hospede" as const, texto }]
    setMsgs(next)
    try {
      const resposta = await aiGenerate(`O hóspede respondeu: "${texto}". Continue o check-in conversacional: confirme os dados, pergunte a hora de chegada e pedidos especiais. Se já tiver dados suficientes, apresente as regras da casa e o código do quarto. Regras: ${profile?.regras_casa ?? ""}`)
      const updated = [...next, { papel: "ia" as const, texto: resposta }]
      setMsgs(updated)
      const concluiu = /código|regras/i.test(resposta)
      await dbUpdate<Checkin>("checkins", active.id, {
        dados: { ultima_resposta: texto },
        estado: concluiu ? "concluido" : "em_curso",
        regras_enviadas: concluiu || active.regras_enviadas,
        codigo_quarto: concluiu ? "4821" : active.codigo_quarto,
      })
      if (concluiu) { toast.success("Check-in concluído! Regras e código enviados ao hóspede."); qc.invalidateQueries({ queryKey: ["checkins"] }) }
    } catch { toast.error("A IA não respondeu. Tente novamente.") }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Check-in conversacional por IA</h1><p className="text-sm text-muted-foreground">Escolha uma reserva e deixe a IA recolher os dados e enviar as regras.</p></div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Nova sessão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reserva">Reserva</Label>
              <select id="reserva" value={reservaId} onChange={(e) => setReservaId(e.target.value)} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Escolha a reserva…</option>
                {reservas.map((r) => <option key={r.id} value={r.id}>{r.codigo_reserva} — {r.nome_hospede} ({format(parseISO(r.check_in), "d MMM", { locale: ptPT })})</option>)}
              </select>
            </div>
            <Button className="w-full" disabled={!reservaId || start.isPending} onClick={() => start.mutate(reservaId)}>
              {start.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Iniciar check-in com IA
            </Button>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sessões anteriores</p>
              {checkinsQ.isLoading ? <Skeleton className="h-16" /> : (checkinsQ.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma sessão ainda.</p> : (
                <ul className="space-y-2">{(checkinsQ.data ?? []).slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                    <span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> {c.codigo_quarto || "—"}</span>
                    <Badge variant={c.estado === "concluido" ? "default" : "secondary"}>{c.estado === "concluido" ? "Concluído" : "Em curso"}</Badge>
                  </li>))}</ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-primary" /> Conversa com o hóspede</CardTitle></CardHeader>
          <CardContent>
            {!active ? <EmptyState icon={MessageSquareText} titulo="Nenhuma conversa ativa" subtitulo="Inicie uma sessão de check-in para conversar com o hóspede por IA." />
              : (
                <div className="space-y-4">
                  <div className="h-80 space-y-3 overflow-y-auto rounded-2xl border bg-muted/40 p-4" aria-live="polite">
                    {msgs.map((m, i) => (
                      <div key={i} className={`flex ${m.papel === "hospede" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.papel === "hospede" ? "bg-primary text-primary-foreground" : "border bg-background"}`}>{m.texto}</div>
                      </div>
                    ))}
                    {busy && <p className="text-sm text-muted-foreground">A IA está a escrever…</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Escreva como se fosse o hóspede…" aria-label="Mensagem do hóspede" />
                    <Button onClick={send} disabled={busy || !input.trim()} aria-label="Enviar mensagem"><Send className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Simule a resposta do hóspede — a IA conduz o check-in, recolhe dados e entrega regras + código do quarto.</p>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
