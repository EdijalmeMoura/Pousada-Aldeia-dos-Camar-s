import { Link } from "react-router-dom"
import { BedDouble, CalendarDays, CreditCard, ShieldCheck } from "lucide-react"
import { BrandMark } from "@/components/BrandMark"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const capabilities = [
  { icon: BedDouble, title: "Quartos e reservas", description: "Registe quartos, crie reservas manuais e receba pedidos públicos na base MySQL da instalação de ensaio." },
  { icon: CalendarDays, title: "Disponibilidade", description: "Bloqueios de datas e prevenção de sobreposições ao guardar reservas no servidor." },
  { icon: ShieldCheck, title: "Contas separadas", description: "Cada pousada acede apenas aos seus dados no painel PHP; é necessário confirmar este isolamento no teste remoto." },
  { icon: CreditCard, title: "Cobrança manual", description: "Prepare mensagens com PIX ou link da pousada. Não existe checkout integrado nem confirmação automática de pagamentos." },
]

export default function PhpLanding() {
  return <div className="min-h-screen bg-background">
    <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-3">Saltar para o conteúdo</a>
    <header className="border-b"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
      <Link to="/" className="flex items-center gap-2 font-bold"><BrandMark /> Hospedaê</Link>
      <div className="flex items-center gap-2"><ThemeToggle /><Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button><Button asChild><Link to="/signup">Conta de ensaio</Link></Button></div>
    </div></header>
    <main id="conteudo" className="mx-auto max-w-6xl space-y-12 px-4 py-12 md:py-20">
      <section className="space-y-5 text-center">
        <p className="mx-auto w-fit rounded-full bg-accent px-4 py-1 text-sm font-semibold text-primary">Versão PHP + MySQL em ensaio</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold md:text-5xl">Reservas diretas, geridas pela sua pousada</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">Painel reduzido para quartos, calendário e reservas. Ainda estamos a validar o backend PHP na Hostinger. Não introduza dados reais de hóspedes nem use esta versão para aceitar reservas reais antes dos testes no servidor.</p>
        <div className="flex flex-wrap justify-center gap-3"><Button asChild><Link to="/login">Entrar no painel de ensaio</Link></Button><Button variant="outline" asChild><Link to="/signup">Criar conta de ensaio</Link></Button></div>
      </section>
      <section aria-label="Funcionalidades disponíveis" className="grid gap-4 sm:grid-cols-2">{capabilities.map(item => <Card key={item.title}><CardContent className="space-y-2 p-5"><item.icon className="h-6 w-6 text-primary" /><h2 className="font-semibold">{item.title}</h2><p className="text-sm text-muted-foreground">{item.description}</p></CardContent></Card>)}</section>
      <section className="rounded-2xl border bg-accent p-6 text-sm"><h2 className="font-semibold">O que ainda não está disponível</h2><p className="mt-2 text-muted-foreground">Sem check-in por IA, subscrições, cobrança InfinitePay ou verificação de pagamento nesta versão. O pacote de produção só será preparado após testar a base MySQL, sessões, reservas concorrentes e privacidade num ambiente separado.</p></section>
    </main>
    <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground"><Link to="/privacidade" className="text-primary underline">Privacidade</Link> · <Link to="/termos" className="text-primary underline">Termos</Link></footer>
  </div>
}
