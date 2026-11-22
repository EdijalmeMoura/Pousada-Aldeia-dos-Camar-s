import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  { q: "Preciso de cartão para testar?", a: "Não é necessário cartão para explorar a demonstração. A faturação de subscrições ainda não está ativa." },
  { q: "Como recebo os pagamentos?", a: "Pode combinar uma cobrança manual por PIX ou link. O checkout InfinitePay, quando configurado no servidor, usa a conta própria da pousada." },
  { q: "O check-in por IA substitui a receção?", a: "Ajuda a recolher dados e a preparar regras e código do quarto. A pousada deve confirmar a identidade e manter supervisão humana." },
  { q: "Posso cancelar quando quiser?", a: "A gestão de subscrições ainda não está disponível. Pode deixar de usar a demonstração a qualquer momento; dados locais não são transferidos entre dispositivos." },
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
