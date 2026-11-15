import { CalendarClock, KeyRound, Link2, MessageCircle, ShieldCheck, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const feats = [
  { icon: Link2, titulo: "Link direto de reserva", texto: "Um endereço bonito com a sua marca. Partilhe no Instagram, WhatsApp e Google — sem comissão." },
  { icon: CalendarClock, titulo: "Calendário sincronizado", texto: "Disponibilidade e tarifas por temporada sempre atualizadas, sem conflito de reservas." },
  { icon: KeyRound, titulo: "Check-in por IA", texto: "Conversa acolhedora que recolhe dados, envia regras e entrega o código do quarto." },
  { icon: MessageCircle, titulo: "WhatsApp automático", texto: "Modelos de cobrança, lembrete e follow-up prontos a enviar com um clique." },
  { icon: Wallet, titulo: "PIX e cartão", texto: "Pagamentos diretos, sem intermediários. A margem fica toda na sua conta." },
  { icon: ShieldCheck, titulo: "Seguro e privado", texto: "Dados protegidos com RLS e encriptação. LGPD desde o primeiro dia." },
]

export function Features() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Funcionalidades</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Tudo para vender direto, num só lugar</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map((f, i) => (
            <Card key={f.titulo} className="animate-fade-up transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 80}ms` }}>
              <CardContent className="space-y-3 p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary"><f.icon className="h-6 w-6" /></span>
                <h3 className="font-semibold">{f.titulo}</h3>
                <p className="text-sm text-muted-foreground">{f.texto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
