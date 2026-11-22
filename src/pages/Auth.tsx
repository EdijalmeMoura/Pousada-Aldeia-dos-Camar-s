import { BrandMark } from "@/components/BrandMark"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, signupSchema, type LoginForm, type SignupForm } from "@/lib/authValidation"
import { toast } from "sonner"
import { Chrome, Loader2, MessageSquareText, Star, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSeo } from "@/lib/utils"


function AuthShell({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={`${import.meta.env.BASE_URL}images/hero.jpg`} alt="Pousada à beira-mar" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <span className="flex items-center gap-2 font-bold"><BrandMark /> Hospedaê</span>
          <div className="space-y-4">
            <h2 className="max-w-md text-3xl font-bold leading-tight">A sua pousada a vender direto — sem comissão, sem fricção.</h2>
            <ul className="space-y-2 text-sm text-white/85">
              <li className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Evite a comissão da plataforma nas reservas diretas</li>
              <li className="flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Check-in assistido com regras da casa</li>
              <li className="flex items-center gap-2"><Star className="h-4 w-4" /> Hóspedes fidelizados à sua marca</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <BrandMark />
            <CardTitle className="text-2xl">{titulo}</CardTitle>
            <CardDescription>{subtitulo}</CardDescription>
          </CardHeader>
          <CardContent>{!isSupabaseConfigured && <p role="status" className="mb-4 rounded-xl bg-accent p-3 text-sm">Modo de demonstração: a conta e os dados ficam apenas neste navegador. Não reutilize uma palavra-passe pessoal nem introduza dados reais de hóspedes.</p>}{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}

export function Login() {
  useSeo("Entrar — Hospedaê", "Aceda ao painel da sua pousada e gira reservas diretas sem comissão.")
  const { signIn, signInGoogle } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    try { await signIn(data.email, data.password); toast.success("Bem-vindo(a) de volta!"); navigate("/app") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível entrar. Tente novamente.") }
  }
  const google = async () => {
    try { await signInGoogle(); if (!isSupabaseConfigured) { toast.info("Conta de demonstração iniciada, sem Google real."); navigate("/onboarding") } }
    catch { toast.error("Não foi possível entrar com o Google.") }
  }

  return (
    <AuthShell titulo="Bem-vindo(a) de volta" subtitulo="Entre para gerir a sua pousada">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" {...register("email")} placeholder="voce@pousada.pt" />{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="password">Palavra-passe</Label><Input id="password" type="password" {...register("password")} placeholder="••••••••" />{errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}</div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Entrar</Button>
        <Button type="button" variant="outline" className="w-full" onClick={google}><Chrome className="h-4 w-4" /> {isSupabaseConfigured ? "Continuar com Google" : "Explorar conta de demonstração"}</Button>
        <p className="text-center text-sm text-muted-foreground">Ainda não tem conta? <Link to="/signup" className="font-medium text-primary hover:underline">Criar conta grátis</Link></p>
      </form>
    </AuthShell>
  )
}

export function Signup() {
  useSeo("Criar conta — Hospedaê", "Crie a sua conta gratuita e comece a vender reservas diretas sem comissão.")
  const { signUp, signInGoogle } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (data: SignupForm) => {
    try { const active = await signUp(data.email, data.password, data.nome); if (!active) { toast.info("Verifique o e-mail para confirmar a conta e depois faça login."); return } toast.success("Conta criada! Vamos configurar a sua pousada."); navigate("/onboarding") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível criar a conta.") }
  }
  const google = async () => {
    try { await signInGoogle(); if (!isSupabaseConfigured) { toast.info("Conta de demonstração iniciada, sem Google real."); navigate("/onboarding") } }
    catch { toast.error("Não foi possível continuar com o Google.") }
  }

  return (
    <AuthShell titulo="Crie a sua conta" subtitulo={isSupabaseConfigured ? "Teste de 7 dias · Sem cartão" : "Demonstração local · Sem cartão"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2"><Label htmlFor="nome">Nome</Label><Input id="nome" {...register("nome")} placeholder="O seu nome" />{errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" {...register("email")} placeholder="voce@pousada.pt" />{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="password">Palavra-passe</Label><Input id="password" type="password" {...register("password")} placeholder="Mínimo 6 caracteres" />{errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}</div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Criar conta grátis</Button>
        <Button type="button" variant="outline" className="w-full" onClick={google}><Chrome className="h-4 w-4" /> {isSupabaseConfigured ? "Continuar com Google" : "Explorar conta de demonstração"}</Button>
        <p className="text-center text-sm text-muted-foreground">Já tem conta? <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link></p>
      </form>
    </AuthShell>
  )
}
