import { BedDouble, CalendarCheck, MessageSquareText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const steps = [
  { icon: BedDouble, titulo: "Cadastre quartos e tarifas", texto: "Defina preços por temporada e gira o calendário. Em minutos, o seu link direto está no ar." },
  { icon: CalendarCheck, titulo: "Hóspede reserva direto", texto: "Sem taxa de plataforma: combine o pagamento por PIX ou link e a margem fica toda sua." },
  { icon: MessageSquareText, titulo: "Check-in conversacional por IA", texto: "A IA recolhe os dados, envia as regras da casa e o código do quarto — sem fricção." },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 md:px-6 md:py-24">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Como funciona</p>
        <h2 className="mt-2 text-3xl font-bold md:text-4xl">Três passos e a sua pousada vende direto</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Sem intermediários, sem comissão, sem complicação.</p>
      </div>
      <div className="relative mt-12 grid gap-6 md:grid-cols-3">
        <div className="absolute left-0 right-0 top-10 hidden border-t-2 border-dashed border-primary/30 md:block" aria-hidden />
        {steps.map((s, i) => (
          <Card key={s.titulo} className="animate-fade-up relative transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 120}ms` }}>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <span className="bg-hero-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md"><s.icon className="h-7 w-7" /></span>
                <span className="text-5xl font-bold text-muted">0{i + 1}</span>
              </div>
              <h3 className="text-lg font-semibold">{s.titulo}</h3>
              <p className="text-sm text-muted-foreground">{s.texto}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
