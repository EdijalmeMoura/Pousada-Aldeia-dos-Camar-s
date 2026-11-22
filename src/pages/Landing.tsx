import PhpLanding from "./PhpLanding"
import { isPhpBackend } from "@/lib/phpBackend"
import { BrandMark } from "@/components/BrandMark"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Features } from "@/components/landing/Features"
import { Pricing } from "@/components/landing/Pricing"
import { Faq } from "@/components/landing/Faq"
import { Footer } from "@/components/landing/Footer"
import { useSeo } from "@/lib/utils"

export default function Landing() {
  useSeo(isPhpBackend ? "Hospedaê — Ensaio PHP e MySQL" : "Hospedaê — Reserva direta sem comissão", isPhpBackend ? "Versão PHP em ensaio: quartos, disponibilidade e reservas; sem pagamentos automáticos." : "Reserve direto na pousada sem taxa de plataforma. Check-in conversacional por IA, calendário interno e cobrança manual por PIX ou link.")
  if (isPhpBackend) return <PhpLanding />
  return (
    <div className="min-h-screen">
      <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-background focus:p-3 focus:text-foreground">Saltar para o conteúdo</a>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <BrandMark />
            Hospedaê
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Navegação">
            <a href="#como-funciona" className="hover:text-primary">Como funciona</a>
            <a href="#preco" className="hover:text-primary">Preço</a>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild><Link to="/signup">Começar grátis</Link></Button>
          </div>
        </div>
      </header>
      <main id="conteudo-principal" className="pt-16">
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
