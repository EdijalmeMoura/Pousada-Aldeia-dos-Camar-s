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
import { waLink } from "@/lib/supabase"
import { prepareCheckinMessage } from "@/lib/checkinMessage"
import type { Quarto } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/EmptyState"

interface Msg { papel: "ia" | "hospede"; texto: string }

export default function Checkin() {
  useSeo("Check-in por IA — Hospedaê", "Check-in conversacional por IA: recolha dados, envie regras e o código do quarto.")
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const reservasQ = useQuery({ queryKey: ["reservas", user!.id], queryFn: () => dbList<Reserva>("reservas", user!.id) })
  const quartosQ = useQuery({ queryKey: ["quartos", user!.id], queryFn: () => dbList<Quarto>("quartos", user!.id) })
  const checkinsQ = useQuery({ queryKey: ["checkins", user!.id], queryFn: () => dbList<Checkin>("checkins", user!.id) })
  const [reservaId, setReservaId] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState<Checkin | null>(null)
  const [verified, setVerified] = useState(false)
  const [messageOpened, setMessageOpened] = useState(false)

  const reservas = (reservasQ.data ?? []).filter((r) => r.estado === "confirmada")
  const selectedReservation = (reservasQ.data ?? []).find(r => r.id === active?.reserva_id)
  const selectedRoom = (quartosQ.data ?? []).find(q => q.id === selectedReservation?.quarto_id)
  let checkinMessage = ""
  if (active && selectedReservation && verified) {
    try { checkinMessage = prepareCheckinMessage(selectedReservation, selectedRoom, profile, verified) } catch { /* mostra aviso abaixo */ }
  }

  const start = useMutation({
    mutationFn: async (rid: string) => {
      const r = reservas.find((x) => x.id === rid)!
      const welcome = await aiWelcomeMessage(r.nome_hospede, profile?.nome_pousada ?? "a pousada", r.codigo_reserva)
      const c = await dbInsert<Checkin>("checkins", { id: uid(), user_id: user!.id, reserva_id: rid, estado: "em_curso", dados: {}, codigo_quarto: "", regras_enviadas: false })
      return { c, welcome }
    },
    onSuccess: async ({ c, welcome }) => {
      setActive(c); setMsgs([{ papel: "ia", texto: welcome }]); setVerified(false); setMessageOpened(false)
      await logActivity(user!.id, "checkin", "Check-in por IA iniciado")
      toast.success("Sessão criada. A mensagem da IA aparece apenas aqui; ainda não foi enviada ao hóspede.")
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
      const resposta = await aiGenerate(`O hóspede respondeu: "${texto}". Continue o check-in conversacional: confirme os dados, pergunte a hora de chegada e pedidos especiais. Se já tiver dados suficientes, apresente as regras da casa. Nunca invente códigos de acesso: o operador da pousada deve verificar e enviar o código real separadamente. Regras: ${profile?.regras_casa ?? ""}`)
      const updated = [...next, { papel: "ia" as const, texto: resposta }]
      setMsgs(updated)
      await dbUpdate<Checkin>("checkins", active.id, { dados: { ultima_resposta: texto } })

    } catch { toast.error("A IA não respondeu. Tente novamente.") }
    setBusy(false)
  }

  const confirmSent = async () => {
    if (!active || !selectedReservation || !messageOpened) return
    try {
      const message = prepareCheckinMessage(selectedReservation, selectedRoom, profile, verified)
      if (!message) return
      await dbUpdate<Checkin>("checkins", active.id, {
        estado: "concluido", regras_enviadas: true, codigo_quarto: selectedRoom!.codigo.trim(),
        dados: { ...active.dados, identidade_confirmada_pelo_operador: "sim", envio_confirmado_pelo_operador: "sim" },
      })
      setActive({ ...active, estado: "concluido", regras_enviadas: true, codigo_quarto: selectedRoom!.codigo.trim() })
      await qc.invalidateQueries({ queryKey: ["checkins"] })
      toast.success("Envio assinalado como confirmado pelo operador.")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível concluir o check-in.") }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Check-in conversacional por IA</h1><p className="text-sm text-muted-foreground">Simule a conversa. O envio de regras e código real é manual e requer confirmação do operador.</p></div>

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
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-primary" /> Simulação de conversa</CardTitle></CardHeader>
          <CardContent>
            {!active ? <EmptyState icon={MessageSquareText} titulo="Nenhuma conversa ativa" subtitulo="Escolha uma reserva confirmada para preparar uma simulação assistida por IA." />
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
                  <p className="text-xs text-muted-foreground">Escreva uma resposta de teste como se fosse o hóspede. Esta conversa não é enviada automaticamente por WhatsApp. Não introduza dados sensíveis sem necessidade.</p>
                  {active.estado !== "concluido" && <div className="space-y-3 rounded-xl border bg-card p-4">
                    <p className="font-semibold">Envio manual das instruções</p>
                    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={verified} onChange={e => { setVerified(e.target.checked); setMessageOpened(false) }} className="mt-1" /> Verifiquei a identidade do hóspede e confirmei que esta é a reserva correta.</label>
                    {!selectedRoom?.codigo?.trim() && <p role="alert" className="text-sm text-destructive">Configure primeiro o código real do quarto na página Quartos.</p>}
                    <div className="flex flex-wrap gap-2">
                      {checkinMessage && selectedReservation && <Button variant="outline" asChild><a href={waLink(selectedReservation.telefone, checkinMessage)} target="_blank" rel="noreferrer" onClick={() => setMessageOpened(true)}>Preparar WhatsApp com regras e código</a></Button>}
                      <Button onClick={confirmSent} disabled={!messageOpened || !verified || !checkinMessage}>Confirmar que enviei a mensagem</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Abrir o WhatsApp não envia a mensagem. Confirme aqui apenas depois de a enviar e verificar o destinatário.</p>
                  </div>}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
