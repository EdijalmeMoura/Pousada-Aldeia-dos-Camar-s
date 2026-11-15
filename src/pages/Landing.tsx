import { Link } from "react-router-dom"
import { BedDouble } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Features } from "@/components/landing/Features"
import { Testimonials } from "@/components/landing/Testimonials"
import { Pricing } from "@/components/landing/Pricing"
import { Faq } from "@/components/landing/Faq"
import { Footer } from "@/components/landing/Footer"
import { useSeo } from "@/lib/utils"

export default function Landing() {
  useSeo("Hospedaê — Reserva direta sem comissão", "Reserve direto na pousada sem taxa de plataforma. Check-in conversacional por IA, calendário sincronizado e pagamento PIX ou cartão.")
  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="bg-hero-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md"><BedDouble className="h-4 w-4" /></span>
            Hospedaê
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Navegação">
            <a href="#como-funciona" className="hover:text-primary">Como funciona</a>
            <a href="#preco" className="hover:text-primary">Preço</a>
            <a href="#depoimentos" className="hover:text-primary">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild><Link to="/signup">Começar grátis</Link></Button>
          </div>
        </div>
      </header>
      <main className="pt-16">
        <Hero />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
