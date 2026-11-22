import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { phpWrite } from "@/lib/phpAuth"
import { publicSlug } from "@/lib/publicSlug"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PousadaSettings() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.nome_pousada ?? "")
  const [slug, setSlug] = useState(profile?.slug ?? "")
  const [busy, setBusy] = useState(false)
  useEffect(() => { setName(profile?.nome_pousada ?? ""); setSlug(profile?.slug ?? "") }, [profile?.nome_pousada, profile?.slug])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    let validated: string
    try { validated = publicSlug(slug) } catch (error) { toast.error(error instanceof Error ? error.message : "Link inválido"); return }
    if (validated !== profile?.slug && !window.confirm("O link antigo deixará de funcionar. Já avisou os hóspedes que o utilizam?")) return
    setBusy(true)
    try {
      await phpWrite("update-pousada", { nome: name.trim(), slug: validated })
      await refreshProfile(); toast.success("Dados da pousada guardados")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível guardar") }
    finally { setBusy(false) }
  }
  const url = profile?.slug ? new URL(`${import.meta.env.BASE_URL}${profile.slug}`, location.origin).href : ""
  return <Card><CardHeader><CardTitle>Dados da pousada</CardTitle></CardHeader><CardContent className="space-y-4">
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div><Label htmlFor="pousada-nome">Nome da pousada</Label><Input id="pousada-nome" required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} /></div>
      <div><Label htmlFor="pousada-slug">Link público</Label><Input id="pousada-slug" required minLength={3} maxLength={40} value={slug} onChange={e => setSlug(e.target.value)} /></div>
      <Button disabled={busy}>Guardar</Button>
    </form>
    <p className="text-xs text-muted-foreground">O link abaixo é o endereço guardado. Alterá-lo invalida o anterior; não partilhe o novo antes de guardar.</p>
    {url && <p className="break-all text-sm">Link guardado: <Link className="text-primary underline" to={`/${profile?.slug}`}>{url}</Link></p>}
  </CardContent></Card>
}
