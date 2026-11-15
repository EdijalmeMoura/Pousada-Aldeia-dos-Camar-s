import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const depoimentos = [
  { nome: "Mariana S.", pousada: "Pousada Vista do Mar, Bahia", texto: "Recuperámos 18% de comissão logo no primeiro mês. O link direto virou o nosso canal principal.", inicial: "M" },
  { nome: "Carlos E.", pousada: "Chalé Serra Verde, Minas Gerais", texto: "O check-in por IA acabou com as filas na receção. Os hóspedes chegam e entram direto no quarto.", inicial: "C" },
  { nome: "Ana Beatriz L.", pousada: "Casa Aldeia, Pernambuco", texto: "Configuração em 10 minutos e calendário sempre sincronizado. Não volto às plataformas.", inicial: "A" },
]

export function Testimonials() {
  return (
    <section id="depoimentos" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Depoimentos</p>
        <h2 className="mt-2 text-3xl font-bold md:text-4xl">Quem já vende direto</h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {depoimentos.map((d, i) => (
          <Card key={d.nome} className="animate-fade-up transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 120}ms` }}>
            <CardContent className="space-y-4 p-6">
              <div className="flex gap-1 text-primary" aria-label="5 estrelas">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}</div>
              <p className="text-sm leading-relaxed">“{d.texto}”</p>
              <div className="flex items-center gap-3">
                <Avatar><AvatarFallback className="bg-accent font-semibold text-primary">{d.inicial}</AvatarFallback></Avatar>
                <div><p className="text-sm font-semibold">{d.nome}</p><p className="text-xs text-muted-foreground">{d.pousada}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
