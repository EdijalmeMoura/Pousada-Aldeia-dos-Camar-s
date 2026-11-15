import { Link } from "react-router-dom"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSeo } from "@/lib/utils"

export default function NotFound() {
  useSeo("Página não encontrada — Hospedaê", "A página que procura não existe ou foi movida.")
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent text-primary"><Compass className="h-10 w-10" /></span>
      <h1 className="text-4xl font-bold">404 — Página não encontrada</h1>
      <p className="max-w-sm text-muted-foreground">Parece que esta rota se perdeu pelo caminho. Volte ao início e continue a sua viagem.</p>
      <Button asChild><Link to="/">Voltar ao início</Link></Button>
    </div>
  )
}
