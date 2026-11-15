import { Link } from "react-router-dom"
import { ArrowRight, BedDouble, CalendarCheck, Check, MessageSquareText, ShieldCheck, Star, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSeo } from "@/lib/utils"

const steps = [
  { icon: BedDouble, titulo: "Cadastre quartos e tarifas", texto: "Defina preços por temporada e sincronize o calendário. Em minutos, o seu link direto está no ar." },
  { icon: CalendarCheck, titulo: "Hóspede reserva direto", texto: "Sem taxa de plataforma: o hóspede paga por PIX ou cartão e a margem fica toda sua." },
  { icon: MessageSquareText, titulo: "Check-in conversacional por IA", texto: "A IA recolhe os dados, envia as regras da casa e o código do quarto — sem fricção." },
]

const depoimentos = [
  { nome: "Mariana S.", pousada: "Pousada Vista do Mar, Bahia", texto: "Recuperámos 18% de comissão logo no primeiro mês. O link direto virou o nosso canal principal." },
  { nome: "Carlos E.", pousada: "Chalé Serra Verde, Minas Gerais", texto: "O check-in por IA acabou com as filas na receção. Os hóspedes chegam e entram direto no quarto." },
  { nome: "Ana Beatriz L.", pousada: "Casa Aldeia, Pernambuco", texto: "Configuração em 10 minutos e calendário sempre sincronizado. Não volto às plataformas." },
]

export default function Landing() {
  useSeo("Pousada Aldeia dos Camarás — Reserva direta sem comissão", "Reserve direto na pousada sem taxa de plataforma. Check-in conversacional por IA, calendário sincronizado e pagamento PIX ou cartão.")
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BedDouble className="h-4 w-4" /></span>
            Aldeia dos Camarás
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Navegação">
            <a href="#como-funciona" className="hover:text-primary">Como funciona</a>
            <a href="#preco" className="hover:text-primary">Preço</a>
            <a href="#depoimentos" className="hover:text-primary">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild><Link to="/signup">Começar grátis <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-16 text-center md:px-6 md:py-24">
          <Badge variant="secondary" className="mb-4">Reserva direta sem taxa de plataforma</Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-6xl">Recupere a margem que as plataformas ficam com elas</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Site de reserva direta com calendário sincronizado e check-in conversacional por IA.
            Sem comissão de 15–20%, sem fricção, com o hóspede fidelizado à sua pousada.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild><Link to="/signup">Criar conta grátis <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild><a href="#como-funciona">Ver como funciona</a></Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">7 dias de teste grátis · Sem cartão · Cancele quando quiser</p>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-4">
            {[{ v: "15–20%", l: "de comissão poupada" }, { v: "<1 min", l: "check-in por IA" }, { v: "R$149", l: "a partir /mês" }].map((s) => (
              <div key={s.l} className="rounded-2xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary">{s.v}</p><p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="border-y bg-muted/40">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
            <h2 className="text-center text-3xl font-bold">Como funciona</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Três passos e a sua pousada vende direto — sem intermediários.</p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <Card key={s.titulo}>
                  <CardContent className="space-y-3 p-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary"><s.icon className="h-6 w-6" /></span>
                      <span className="text-4xl font-bold text-muted">0{i + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold">{s.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{s.texto}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="depoimentos" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-center text-3xl font-bold">Quem já vende direto</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {depoimentos.map((d) => (
              <Card key={d.nome}>
                <CardContent className="space-y-3 p-6">
                  <div className="flex gap-1 text-primary" aria-label="5 estrelas">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                  <p className="text-sm">“{d.texto}”</p>
                  <div><p className="text-sm font-semibold">{d.nome}</p><p className="text-xs text-muted-foreground">{d.pousada}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="preco" className="border-y bg-muted/40">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
            <h2 className="text-center text-3xl font-bold">Preço simples, sem surpresas</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Uma única reserva direta por mês já paga a subscrição.</p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
              {[
                { nome: "Essencial", preco: "R$149", feats: ["Até 5 quartos", "Link direto de reserva", "Check-in por IA", "Calendário sincronizado", "Suporte por e-mail"] },
                { nome: "Pro", preco: "R$299", feats: ["Quartos ilimitados", "Tudo do Essencial", "WhatsApp automático", "Tarifas por temporada", "Suporte prioritário"], destaque: true },
              ].map((p) => (
                <Card key={p.nome} className={p.destaque ? "border-primary shadow-lg" : ""}>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between"><h3 className="font-semibold">{p.nome}</h3>{p.destaque && <Badge>Mais popular</Badge>}</div>
                    <p><span className="text-4xl font-bold">{p.preco}</span><span className="text-muted-foreground">/mês</span></p>
                    <ul className="space-y-2">{p.feats.map((f) => <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" />{f}</li>)}</ul>
                    <Button className="w-full" asChild><Link to="/signup">Começar teste grátis</Link></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 text-center md:px-6">
          <Wallet className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-3xl font-bold">Pronto para vender direto?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Junte-se a pousadas que já recuperaram a margem. Configuração em menos de 10 minutos.</p>
          <Button size="lg" className="mt-6" asChild><Link to="/signup">Criar conta grátis <ArrowRight className="h-4 w-4" /></Link></Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
          <p>© {new Date().getFullYear()} Pousada Aldeia dos Camarás. Todos os direitos reservados.</p>
          <nav className="flex gap-5" aria-label="Rodapé">
            <Link to="/privacidade" className="hover:text-primary">Privacidade</Link>
            <Link to="/termos" className="hover:text-primary">Termos</Link>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Pagamentos seguros</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
