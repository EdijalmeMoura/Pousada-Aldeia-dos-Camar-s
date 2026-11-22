import { BrandMark } from "@/components/BrandMark"
import { Link } from "react-router-dom"
import { } from "lucide-react"
import { useSeo } from "@/lib/utils"

function Shell({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  useSeo(`${titulo} — Hospedaê`, `${titulo} da Hospedaê.`)
  return (
    <div className="min-h-screen">
      <header className="border-b"><div className="mx-auto flex h-16 max-w-7xl items-center px-4 md:px-6"><Link to="/" className="flex items-center gap-2 font-bold"><BrandMark /> Hospedaê</Link></div></header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-12 md:px-6">
        <h1 className="text-3xl font-bold">{titulo}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </main>
    </div>
  )
}

export function Privacidade() {
  return (
    <Shell titulo="Política de privacidade">
      <p>Última atualização: 15 de novembro de 2026.</p>
      <h2 className="text-base font-semibold text-foreground">1. Dados que recolhemos</h2>
      <p>Recolhemos apenas os dados necessários à prestação do serviço: nome, e-mail, telefone, dados da reserva (datas, quarto, número de hóspedes) e dados de utilização da plataforma. Não recolhemos dados sensíveis.</p>
      <h2 className="text-base font-semibold text-foreground">2. Finalidade</h2>
      <p>Os dados são usados para gerir reservas diretas, check-in, comunicações por WhatsApp/e-mail e melhoria do serviço. Nunca vendemos dados a terceiros.</p>
      <h2 className="text-base font-semibold text-foreground">3. Direitos do titular (LGPD)</h2>
      <p>Pode aceder, corrigir ou eliminar os seus dados a qualquer momento através das configurações ou por e-mail para privacidade@hospedae.pt. Respondemos em até 15 dias.</p>
      <h2 className="text-base font-semibold text-foreground">4. Segurança</h2>
      <p>Os dados são armazenados em infraestrutura com encriptação e controlo de acesso por utilizador (RLS). O acesso é limitado ao estritamente necessário.</p>
    </Shell>
  )
}

export function Termos() {
  return (
    <Shell titulo="Termos de serviço">
      <p>Última atualização: 15 de novembro de 2026.</p>
      <h2 className="text-base font-semibold text-foreground">1. O serviço</h2>
      <p>A Hospedaê disponibiliza uma plataforma de reserva direta para pousadas e aluguéis de temporada, com calendário de disponibilidade e check-in conversacional por IA.</p>
      <h2 className="text-base font-semibold text-foreground">2. Planos e pagamento</h2>
      <p>Oferecemos 7 dias de teste grátis, sem cartão. Após o teste, os planos Essencial (R$149/mês) e Pro (R$299/mês) são faturados mensalmente. Pode cancelar a qualquer momento.</p>
      <h2 className="text-base font-semibold text-foreground">3. Responsabilidades</h2>
      <p>A pousada é responsável pela veracidade dos dados dos quartos, tarifas e regras da casa. A plataforma não intervém na relação entre pousada e hóspede.</p>
      <h2 className="text-base font-semibold text-foreground">4. Uso aceitável</h2>
      <p>É proibido usar a plataforma para fins ilegais ou para spam. Reservamo-nos o direito de suspender contas que violem estes termos.</p>
    </Shell>
  )
}
