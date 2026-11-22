import { useState } from "react"
import { toast } from "sonner"
import { phpWrite } from "@/lib/phpAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PasswordSettings() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (next !== confirm) { toast.error("As novas palavras-passe não coincidem."); return }
    if (next.length < 12) { toast.error("A nova palavra-passe precisa de pelo menos 12 caracteres."); return }
    setBusy(true)
    try {
      await phpWrite("change-password", { current_password: current, new_password: next })
      setCurrent(""); setNext(""); setConfirm("")
      toast.success("Palavra-passe alterada. As outras sessões deixam de ter acesso.")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar a palavra-passe") }
    finally { setBusy(false) }
  }
  return <Card><CardHeader><CardTitle>Segurança da conta</CardTitle></CardHeader><CardContent>
    <form onSubmit={save} className="max-w-md space-y-3">
      <div><Label htmlFor="current-password">Palavra-passe atual</Label><Input id="current-password" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} /></div>
      <div><Label htmlFor="new-password">Nova palavra-passe (mínimo 12 caracteres)</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={next} onChange={e => setNext(e.target.value)} /></div>
      <div><Label htmlFor="confirm-password">Confirmar nova palavra-passe</Label><Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">A alteração termina as outras sessões da conta. Ainda não existe recuperação automática de palavra-passe.</p>
      <Button disabled={busy}>Alterar palavra-passe</Button>
    </form>
  </CardContent></Card>
}
