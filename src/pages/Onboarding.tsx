import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, BedDouble, Check, Loader2, Palette, User } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { saveProfile } from "@/lib/db"
import { slugify, useSeo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const schema = z.object({
  nome: z.string().min(2, "Indique o seu nome"),
  nome_pousada: z.string().min(2, "Indique o nome da pousada"),
  slug: z.string().min(3, "O link público deve ter pelo menos 3 caracteres").regex(/^[a-z0-9-]+$/, "Use apenas letras, números e hífens"),
  whatsapp: z.string().min(10, "Indique o WhatsApp com DDD (ex.: 81987654321)"),
  cor: z.string().min(1, "Escolha uma cor"),
  regras_casa: z.string().min(10, "Descreva as regras da casa (mín. 10 caracteres)"),
})
type Form = z.infer<typeof schema>

const cores = ["#0891b2", "#0d9488", "#ea580c", "#7c3aed", "#db2777", "#65a30d"]

export default function Onboarding() {
  useSeo("Configuração inicial — Hospedaê", "Configure o perfil, a marca e a primeira ação da sua pousada em 3 passos rápidos.")
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nome: profile?.nome ?? "", nome_pousada: profile?.nome_pousada ?? "", slug: profile?.slug ?? "", whatsapp: profile?.whatsapp ?? "", cor: profile?.cor ?? "#0891b2", regras_casa: profile?.regras_casa ?? "" },
  })
  const cor = watch("cor")

  const next = async () => {
    if (step === 0) {
      const nome = watch("nome"); const pousada = watch("nome_pousada")
      if (nome.length < 2 || pousada.length < 2) { toast.error("Preencha o seu nome e o nome da pousada."); return }
      setValue("slug", slugify(pousada))
    }
    if (step === 1) {
      if (watch("whatsapp").replace(/\D/g, "").length < 10) { toast.error("Indique um WhatsApp válido com DDD."); return }
    }
    setStep((s) => Math.min(s + 1, 2))
  }

  const finish = async (data: Form) => {
    if (!profile) return
    try {
      await saveProfile({ ...profile, ...data, onboarding_concluido: true })
      await refreshProfile()
      toast.success("Pousada configurada! Bem-vindo(a) ao painel.")
      navigate("/app")
    } catch { toast.error("Não foi possível guardar. Tente novamente.") }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BedDouble className="h-4 w-4" /></span> Hospedaê</span>
              <span className="text-sm text-muted-foreground">Passo {step + 1} de 3</span>
            </div>
            <Progress value={((step + 1) / 3) * 100} />
          </div>

          <form onSubmit={handleSubmit(finish)}>
            {step === 0 && (
              <div className="space-y-4">
                <h1 className="flex items-center gap-2 text-xl font-bold"><User className="h-5 w-5 text-primary" /> O seu perfil</h1>
                <div className="space-y-2"><Label htmlFor="nome">O seu nome</Label><Input id="nome" {...register("nome")} placeholder="Ex.: Maria Silva" />{errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}</div>
                <div className="space-y-2"><Label htmlFor="nome_pousada">Nome da pousada</Label><Input id="nome_pousada" {...register("nome_pousada")} placeholder="Ex.: Hospedaê" />{errors.nome_pousada && <p className="text-sm text-destructive">{errors.nome_pousada.message}</p>}</div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                <h1 className="flex items-center gap-2 text-xl font-bold"><Palette className="h-5 w-5 text-primary" /> Marca e contacto</h1>
                <div className="space-y-2"><Label htmlFor="slug">Link público de reserva</Label>
                  <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">/{watch("slug") || "…"}</span></div>
                  <Input id="slug" {...register("slug")} placeholder="hospedae" />{errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                  <p className="text-xs text-muted-foreground">É este o endereço que partilha com os hóspedes — sem taxa de plataforma.</p>
                </div>
                <div className="space-y-2"><Label htmlFor="whatsapp">WhatsApp (com DDD)</Label><Input id="whatsapp" {...register("whatsapp")} placeholder="81987654321" inputMode="numeric" />{errors.whatsapp && <p className="text-sm text-destructive">{errors.whatsapp.message}</p>}</div>
                <div className="space-y-2"><Label>Cor da marca</Label>
                  <div className="flex gap-2">{cores.map((c) => (
                    <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => setValue("cor", c)} className={`h-10 w-10 rounded-xl transition-all duration-200 active:scale-[0.98] ${cor === c ? "ring-2 ring-offset-2 ring-ring" : ""}`} style={{ backgroundColor: c }}>
                      {cor === c && <Check className="mx-auto h-5 w-5 text-white" />}
                    </button>))}</div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h1 className="flex items-center gap-2 text-xl font-bold"><Check className="h-5 w-5 text-primary" /> Primeira ação: regras da casa</h1>
                <p className="text-sm text-muted-foreground">A IA usa estas regras no check-in conversacional e envia-as ao hóspede com o código do quarto.</p>
                <div className="space-y-2"><Label htmlFor="regras_casa">Regras da casa</Label><Textarea id="regras_casa" {...register("regras_casa")} placeholder="Ex.: Check-in a partir das 14h, check-out até às 11h, sem fumar nos quartos…" />{errors.regras_casa && <p className="text-sm text-destructive">{errors.regras_casa.message}</p>}</div>
              </div>
            )}

            <div className="mt-6 flex justify-between gap-3">
              {step > 0 ? <Button type="button" variant="outline" onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Voltar</Button> : <span />}
              {step < 2
                ? <Button type="button" onClick={next}>Continuar <ArrowRight className="h-4 w-4" /></Button>
                : <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Ir para o painel <ArrowRight className="h-4 w-4" /></Button>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
