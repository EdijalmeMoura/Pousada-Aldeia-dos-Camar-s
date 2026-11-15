import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  { q: "Preciso de cartão para testar?", a: "Não. Os 7 dias de teste são gratuitos e sem cartão. Só paga se decidir continuar." },
  { q: "Como recebo os pagamentos?", a: "Direto na sua conta, por PIX ou cartão. A plataforma não retém nem cobra comissão sobre reservas diretas." },
  { q: "O check-in por IA substitui a receção?", a: "Substitui a burocracia: a IA recolhe dados, envia regras e o código do quarto. A receção fica para o que importa — acolher bem." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelização nem multas. O seu link público fica ativo enquanto a subscrição estiver válida." },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <h2 className="text-center text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
      <div className="mt-10 space-y-3">
        {faqs.map((f, i) => (
          <div key={f.q} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <button className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium transition-colors hover:bg-accent/50" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {f.q}
              <ChevronDown className={cn("h-5 w-5 shrink-0 text-primary transition-transform duration-200", open === i && "rotate-180")} />
            </button>
            {open === i && <p className="animate-fade-up border-t p-5 text-sm text-muted-foreground">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
