import { Link } from "react-router-dom"
import { ArrowRight, CalendarCheck, MessageSquareText, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src="/images/hero.jpg" alt="Pousada à beira-mar com piscina turquesa" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 text-center text-white md:px-6 md:pt-28">
        <Badge className="mb-5 border-white/30 bg-white/15 text-white backdrop-blur">Reserva direta · Sem taxa de plataforma</Badge>
        <h1 className="animate-fade-up mx-auto max-w-3xl text-4xl font-bold leading-[1.1] md:text-6xl">
          Recupere a margem que as plataformas ficam com elas
        </h1>
        <p className="animate-fade-up mx-auto mt-5 max-w-2xl text-lg text-white/85" style={{ animationDelay: "100ms" }}>
          Site de reserva direta com calendário sincronizado e check-in conversacional por IA.
          Sem comissão de 15–20%, sem fricção, com o hóspede fidelizado à sua pousada.
        </p>
        <div className="animate-fade-up mt-8 flex flex-col justify-center gap-3 sm:flex-row" style={{ animationDelay: "200ms" }}>
          <Button size="lg" className="shadow-lg" asChild><Link to="/signup">Criar conta grátis <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20" asChild><a href="#como-funciona">Ver como funciona</a></Button>
        </div>
        <p className="mt-4 text-sm text-white/70">7 dias de teste grátis · Sem cartão · Cancele quando quiser</p>

        <div className="animate-fade-up mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-3 md:gap-4" style={{ animationDelay: "300ms" }}>
          {[{ v: "15–20%", l: "de comissão poupada" }, { v: "<1 min", l: "check-in por IA" }, { v: "R$149", l: "a partir /mês" }].map((s) => (
            <div key={s.l} className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-2xl font-bold md:text-3xl">{s.v}</p><p className="mt-1 text-xs text-white/75">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="animate-fade-up mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-md">
            <CalendarCheck className="h-4 w-4" /> Calendário sincronizado
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-md">
            <MessageSquareText className="h-4 w-4" /> Check-in por IA
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-md">
            <Star className="h-4 w-4 fill-current" /> 4,9/5 de satisfação
          </div>
        </div>
      </div>
    </section>
  )
}
