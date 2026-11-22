import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { phpRequest } from "@/lib/phpBackend"
import { phpWrite } from "@/lib/phpAuth"
import { validatePaymentDetails } from "@/lib/manualPayment"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Details = { chave_pix: string; link_pagamento: string }
export function PaymentSettings() {
  const qc = useQueryClient()
  const details = useQuery({ queryKey: ["php-payment-settings"], queryFn: () => phpRequest<Details>("my-payment-settings") })
  const [pix, setPix] = useState("")
  const [link, setLink] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (details.data) { setPix(details.data.chave_pix); setLink(details.data.link_pagamento) } }, [details.data])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const error = validatePaymentDetails(pix.trim(), link.trim())
    if (error) { toast.error(error); return }
    setBusy(true)
    try {
      await phpWrite("update-payment-settings", { chave_pix: pix.trim(), link_pagamento: link.trim() })
      await qc.invalidateQueries({ queryKey: ["php-payment-settings"] })
      toast.success("Dados de cobrança manual guardados")
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Não foi possível guardar") }
    finally { setBusy(false) }
  }
  return <Card><CardHeader><CardTitle>Cobrança manual da pousada</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">Estes dados são privados da conta. Não introduza aqui chaves de API InfinitePay. Não existe checkout nem confirmação automática de pagamentos.</p>
    {details.isError && <p role="alert">Não foi possível carregar os dados. <Button variant="link" onClick={() => details.refetch()}>Tentar novamente</Button></p>}
    <form onSubmit={save} className="max-w-xl space-y-3">
      <div><Label htmlFor="php-pix">Chave PIX da pousada</Label><Input id="php-pix" maxLength={140} autoComplete="off" value={pix} onChange={e => setPix(e.target.value)} /></div>
      <div><Label htmlFor="php-payment-link">Link HTTPS de pagamento (opcional)</Label><Input id="php-payment-link" type="url" maxLength={1024} autoComplete="off" value={link} onChange={e => setLink(e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">Se o prestador criar um link único por reserva, não guarde aqui um link reutilizável. Reveja cada cobrança antes de a enviar manualmente.</p>
      <Button disabled={busy || details.isLoading || details.isError}>Guardar dados de cobrança</Button>
    </form>
  </CardContent></Card>
}
