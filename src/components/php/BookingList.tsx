import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { phpWrite } from "@/lib/phpAuth"
import { downloadPhpBookings, phpConfirmationMessage, type PhpBooking } from "@/lib/phpBookingOperations"
import { confirmationMailto } from "@/lib/guestCommunication"
import { waLink, normalizePhone } from "@/lib/supabase"
import { brl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Room = { id: string; nome: string }
export function BookingList({ bookings, rooms, pousada }: { bookings: PhpBooking[]; rooms: Room[]; pousada: string }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const confirm = async (id: string) => {
    if (!window.confirm("Confirmar esta estadia? Não confirma pagamento nem envia mensagem automaticamente.")) return
    setBusy(true)
    try {
      await phpWrite("confirm-booking", { id })
      await qc.invalidateQueries({ queryKey: ["php-bookings"] })
      toast.success("Estadia confirmada. Contacte o hóspede manualmente; não foi confirmada nenhuma cobrança.")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível confirmar") }
    finally { setBusy(false) }
  }
  return <Card><CardHeader><CardTitle>Reservas registadas</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-xs text-muted-foreground">Contacto e exportação contêm dados pessoais. Partilhe o CSV apenas com pessoas autorizadas; o ficheiro é gerado neste navegador.</p>
    <Button variant="outline" size="sm" disabled={!bookings.length} onClick={() => downloadPhpBookings(bookings)}>Exportar CSV</Button>
    <ul className="space-y-3">{bookings.map(r => {
      const room = rooms.find(q => q.id.toLowerCase() === r.quarto_id.toLowerCase())?.nome ?? "quarto reservado"
      const message = r.estado === "confirmada" ? phpConfirmationMessage(r, pousada, room) : null
      const phone = normalizePhone(r.telefone)
      return <li key={r.id} className="space-y-2 rounded-lg border p-3 text-sm">
        <p><strong>{r.codigo_reserva}</strong> · {r.nome_hospede} · {r.check_in} a {r.check_out} · {brl(Number(r.valor_total))} · {r.estado}</p>
        <p className="break-all text-muted-foreground">{r.email} · {r.telefone}</p>
        <div className="flex flex-wrap gap-2">
          {r.estado === "pendente" && <Button variant="outline" size="sm" disabled={busy} onClick={() => confirm(r.id)}>Confirmar estadia</Button>}
          {message && <><Button variant="outline" size="sm" asChild><a href={confirmationMailto(r.email, `Reserva ${r.codigo_reserva} confirmada`, message)}>Preparar e-mail</a></Button>
            {/^[0-9]{12,13}$/.test(phone) && <Button variant="outline" size="sm" asChild><a href={waLink(r.telefone, message)} target="_blank" rel="noopener noreferrer">Preparar WhatsApp</a></Button>}</>}
        </div>
        {message && <p className="text-xs text-muted-foreground">As mensagens só abrem a sua aplicação de e-mail ou WhatsApp; confirme e envie manualmente.</p>}
      </li>
    })}</ul>
  </CardContent></Card>
}
