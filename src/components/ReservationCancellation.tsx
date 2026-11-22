import { useState } from "react"
import { toast } from "sonner"
import { Ban, RotateCcw } from "lucide-react"
import type { Reserva } from "@/lib/db"
import { cancelReservation, registerManualRefund } from "@/lib/cancellations"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function ReservationCancellation({ reservation: r, ownerId, onChanged }: { reservation: Reserva; ownerId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"cancel" | "refund">("cancel")
  const [value, setValue] = useState("")
  const [pending, setPending] = useState(false)
  const ask = (next: "cancel" | "refund") => { setMode(next); setValue(""); setOpen(true) }
  const submit = async () => {
    setPending(true)
    try {
      if (mode === "cancel") {
        const result = await cancelReservation(r, ownerId, value)
        toast.success(result.reembolso_estado === "requer_analise" ? "Reserva cancelada. Verifique o reembolso no prestador de pagamentos." : "Reserva cancelada.")
      } else {
        await registerManualRefund(r, ownerId, value)
        toast.success("Reembolso manual registado. Guarde o comprovativo do prestador.")
      }
      setOpen(false); onChanged()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir a operação.") }
    finally { setPending(false) }
  }
  return <>
    {["pendente", "confirmada"].includes(r.estado) && <Button size="icon" variant="ghost" aria-label="Cancelar reserva" title={r.pagamento_estado === "aguarda_pagamento" && r.checkout_url ? "Verifique o checkout ativo na InfinitePay antes de cancelar" : "Cancelar reserva"} disabled={r.pagamento_estado === "aguarda_pagamento" && Boolean(r.checkout_url)} onClick={() => ask("cancel")}><Ban className="h-4 w-4 text-destructive" /></Button>}
    {r.reembolso_estado === "requer_analise" && <Button size="icon" variant="ghost" aria-label="Registar reembolso feito fora da plataforma" title="Registar reembolso manual" onClick={() => ask("refund")}><RotateCcw className="h-4 w-4 text-primary" /></Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{mode === "cancel" ? `Cancelar ${r.codigo_reserva}` : `Registar reembolso de ${r.codigo_reserva}`}</DialogTitle></DialogHeader>
      {mode === "cancel" ? <><p className="text-sm text-muted-foreground">O quarto ficará disponível. {r.pagamento_estado === "pago" ? "Há um pagamento verificado: será assinalado para análise de reembolso, mas nenhum valor será devolvido automaticamente." : "Não há pagamento verificado na plataforma."}</p><div className="space-y-2"><Label htmlFor={`reason-${r.id}`}>Motivo (5–500 caracteres)</Label><Textarea id={`reason-${r.id}`} value={value} maxLength={500} onChange={e => setValue(e.target.value)} placeholder="Descreva o motivo do cancelamento" /></div></>
        : <><p className="text-sm text-muted-foreground">Registe esta operação apenas <strong>depois</strong> de efetuar o reembolso na InfinitePay ou no banco e conferir o comprovativo. Esta ação não devolve dinheiro.</p><div className="space-y-2"><Label htmlFor={`ref-${r.id}`}>Referência do reembolso (5–200 caracteres)</Label><Input id={`ref-${r.id}`} value={value} maxLength={200} onChange={e => setValue(e.target.value)} placeholder="Identificador da operação no prestador" /></div></>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Voltar</Button><Button variant={mode === "cancel" ? "destructive" : "default"} onClick={submit} disabled={pending || value.trim().length < 5}>{mode === "cancel" ? "Confirmar cancelamento" : "Registar operação manual"}</Button></div>
    </DialogContent></Dialog>
  </>
}
