import { useState } from "react"
import { toast } from "sonner"
import { Check, Copy, ExternalLink, Loader2, MessageCircle, Save } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { saveProfile } from "@/lib/db"
import { waLink, waTemplates } from "@/lib/supabase"
import { slugify, useSeo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function Configuracoes() {
  useSeo("Configurações — Hospedaê", "Gira perfil, plano, WhatsApp e o link público de reserva da sua pousada.")
  const { profile, refreshProfile } = useAuth()
  const [nome, setNome] = useState(profile?.nome ?? "")
  const [pousada, setPousada] = useState(profile?.nome_pousada ?? "")
  const [slug, setSlug] = useState(profile?.slug ?? "")
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? "")
  const [regras, setRegras] = useState(profile?.regras_casa ?? "")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!profile) return null
  const publicUrl = `${location.origin}/${slug || profile.slug}`

  const save = async () => {
    setSaving(true)
    try {
      await saveProfile({ ...profile, nome, nome_pousada: pousada, slug: slugify(slug), whatsapp, regras_casa: regras })
      await refreshProfile()
      toast.success("Configurações guardadas!")
    } catch { toast.error("Não foi possível guardar.") }
    setSaving(false)
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); toast.success("Link copiado! Partilhe com os hóspedes."); setTimeout(() => setCopied(false), 2000) }
    catch { toast.error("Não foi possível copiar o link.") }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Configurações</h1><p className="text-sm text-muted-foreground">Perfil, plano, integrações e link público.</p></div>

      <Tabs defaultValue="perfil">
        <TabsList><TabsTrigger value="perfil">Perfil</TabsTrigger><TabsTrigger value="plano">Plano e faturação</TabsTrigger><TabsTrigger value="integracoes">Integrações</TabsTrigger></TabsList>

        <TabsContent value="perfil">
          <Card><CardHeader><CardTitle>Perfil da pousada</CardTitle><CardDescription>Estes dados aparecem no seu link público de reserva.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="nome">O seu nome</Label><Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="pousada">Nome da pousada</Label><Input id="pousada" value={pousada} onChange={(e) => setPousada(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="slug">Link público (slug)</Label>
                <div className="flex gap-2"><Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} /><Button variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar</Button></div>
                <p className="text-xs text-muted-foreground">Endereço público: <a className="text-primary hover:underline" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a></p>
              </div>
              <div className="space-y-2"><Label htmlFor="regras">Regras da casa (usadas no check-in IA)</Label><Textarea id="regras" value={regras} onChange={(e) => setRegras(e.target.value)} /></div>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} <Save className="h-4 w-4" /> Guardar alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plano">
          <Card><CardHeader><CardTitle>Plano atual</CardTitle><CardDescription>Sem taxas escondidas. Cancele quando quiser.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="text-base">{profile.plano === "trial" ? "Teste grátis" : profile.plano}</Badge>
                <p className="text-sm text-muted-foreground">{profile.plano === "trial" ? "7 dias grátis, sem cartão. Depois: R$149–299/mês." : "Subscrição ativa."}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[{ nome: "Essencial", preco: "R$149/mês", atual: profile.plano === "essencial" }, { nome: "Pro", preco: "R$299/mês", atual: profile.plano === "pro" }].map((p) => (
                  <div key={p.nome} className="rounded-2xl border p-4">
                    <p className="font-semibold">{p.nome}</p><p className="text-2xl font-bold">{p.preco}</p>
                    <Button className="mt-3 w-full" variant={p.atual ? "secondary" : "default"} disabled={p.atual} onClick={async () => { await saveProfile({ ...profile, plano: p.nome.toLowerCase() }); await refreshProfile(); toast.success(`Plano ${p.nome} ativado!`) }}>{p.atual ? "Plano atual" : "Escolher plano"}</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes">
          <Card><CardHeader><CardTitle>Integrações</CardTitle><CardDescription>WhatsApp e link público de reserva direta.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp da pousada (com DDD)</Label>
                <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="81987654321" inputMode="numeric" />
                <p className="text-xs text-muted-foreground">Usado para cobranças, lembretes e follow-up automáticos.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button variant="outline" asChild><a href={waLink(whatsapp || "5500000000000", waTemplates.cobranca("hóspede", "R$ 300,00"))} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Modelo cobrança</a></Button>
                <Button variant="outline" asChild><a href={waLink(whatsapp || "5500000000000", waTemplates.lembrete("hóspede", "amanhã"))} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Modelo lembrete</a></Button>
                <Button variant="outline" asChild><a href={waLink(whatsapp || "5500000000000", waTemplates.followUp("hóspede"))} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Modelo follow-up</a></Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-4">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">Link público de reserva</p><p className="truncate text-sm text-muted-foreground">{publicUrl}</p></div>
                <Button variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar</Button>
                <Button asChild><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir</a></Button>
              </div>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} <Save className="h-4 w-4" /> Guardar integrações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
