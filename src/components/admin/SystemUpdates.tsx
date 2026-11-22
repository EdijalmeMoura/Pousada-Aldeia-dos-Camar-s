import { ExternalLink, History, ShieldCheck } from "lucide-react"
import { systemUpdates, repository } from "@/lib/systemUpdates"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SystemUpdates({ demo }: { demo: boolean }) {
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Atualizações do sistema</CardTitle>
      <CardDescription>Seleção de alterações do projeto, com referências verificáveis no GitHub.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="rounded-xl bg-accent p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Apenas consulta</p>
        <p className="mt-1 text-muted-foreground">Esta página não instala atualizações nem confirma que migrações ou funções estão publicadas no Supabase. {demo ? "Está a visualizar uma conta de demonstração local, sem permissões administrativas reais." : "Confirme o estado do alojamento e da base de dados antes de publicar uma nova versão."}</p>
      </div>
      <ol className="space-y-3">{systemUpdates.map((item) => <li key={item.commit} className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><Badge variant="secondary" className="font-mono">{item.commit}</Badge></div>
        <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
        <a href={`${repository}/commit/${item.commit}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Ver alteração no GitHub <ExternalLink className="h-4 w-4" /></a>
      </li>)}</ol>
    </CardContent>
  </Card>
}
