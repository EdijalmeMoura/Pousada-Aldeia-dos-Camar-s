import { BrandMark } from "@/components/BrandMark"
import { Link } from "react-router-dom"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Footer() {
  return (
    <>
      <section className="bg-hero-gradient">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-white md:px-6 md:py-20">
          <h2 className="text-3xl font-bold md:text-4xl">Pronto para vender direto?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">Junte-se a pousadas que já recuperaram a margem. Configuração em menos de 10 minutos.</p>
          <Button size="lg" variant="secondary" className="mt-6 shadow-lg" asChild><Link to="/signup">Criar conta grátis <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </section>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
          <p className="flex items-center gap-2"><BrandMark /> © {new Date().getFullYear()} Hospedaê.</p>
          <nav className="flex gap-5" aria-label="Rodapé">
            <Link to="/privacidade" className="hover:text-primary">Privacidade</Link>
            <Link to="/termos" className="hover:text-primary">Termos</Link>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Pagamentos seguros</span>
          </nav>
        </div>
      </footer>
    </>
  )
}
