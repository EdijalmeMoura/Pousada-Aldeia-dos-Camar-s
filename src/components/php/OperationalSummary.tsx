import { useQuery } from "@tanstack/react-query"
import { phpRequest } from "@/lib/phpBackend"
import { brl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Summary = { pendentes: number; confirmadas: number; chegadas_hoje: number; valor_reservado: number }
export function OperationalSummary() {
  const summary = useQuery({ queryKey: ["php-summary"], queryFn: () => phpRequest<Summary>("my-summary") })
  return <section aria-label="Resumo operacional" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">Resumo da pousada</h2><Button variant="outline" size="sm" onClick={() => summary.refetch()}>Atualizar</Button></div>
    {summary.isError && <p role="alert" className="text-sm">Não foi possível carregar o resumo. Tente novamente.</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {([
        ["Pendentes", summary.data?.pendentes],
        ["Confirmadas", summary.data?.confirmadas],
        ["Chegadas hoje", summary.data?.chegadas_hoje],
        ["Valor reservado", summary.data ? brl(Number(summary.data.valor_reservado)) : undefined],
      ] as const).map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.isLoading ? "…" : summary.isError ? "—" : value}</CardContent></Card>)}
    </div>
    <p className="text-xs text-muted-foreground">Valor reservado = soma de reservas pendentes e confirmadas; não é faturação nem pagamento recebido. Horário de «hoje» segue o fuso configurado no MySQL.</p>
  </section>
}
