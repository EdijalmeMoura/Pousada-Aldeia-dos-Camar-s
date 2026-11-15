import { Link } from "react-router-dom"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const planos = [
  { nome: "Essencial", preco: "R$149", feats: ["Até 5 quartos", "Link direto de reserva", "Check-in por IA", "Calendário sincronizado", "Suporte por e-mail"], destaque: false },
  { nome: "Pro", preco: "R$299", feats: ["Quartos ilimitados", "Tudo do Essencial", "WhatsApp automático", "Tarifas por temporada", "Suporte prioritário"], destaque: true },
]

export function Pricing() {
  return (
    <section id="preco" className="scroll-mt-20 border-y bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Preço</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Preço simples, sem surpresas</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Uma única reserva direta por mês já paga a subscrição.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
          {planos.map((p) => (
            <Card key={p.nome} className={p.destaque ? "animate-fade-up border-primary shadow-xl ring-1 ring-primary" : "animate-fade-up transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"}>
              <CardContent className="space-y-5 p-7">
                <div className="flex items-center justify-between"><h3 className="font-semibold">{p.nome}</h3>{p.destaque && <Badge>Mais popular</Badge>}</div>
                <p><span className="text-4xl font-bold">{p.preco}</span><span className="text-muted-foreground">/mês</span></p>
                <ul className="space-y-2.5">{p.feats.map((f) => <li key={f} className="flex items-center gap-2 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-primary"><Check className="h-3 w-3" /></span>{f}</li>)}</ul>
                <Button className="w-full" asChild><Link to="/signup">Começar teste grátis</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
