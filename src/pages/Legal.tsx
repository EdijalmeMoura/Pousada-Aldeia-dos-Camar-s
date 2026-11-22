import { BrandMark } from "@/components/BrandMark"
import { Link } from "react-router-dom"
import { isPhpBackend } from "@/lib/phpBackend"
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
    <Shell titulo="Privacidade">
      <p>Informação para avaliação do serviço — antes de uma publicação com dados reais, a política de privacidade deve ser revista e completada pela entidade responsável.</p>
      {isPhpBackend && <p role="status">Versão PHP em ensaio: não introduza dados reais de hóspedes nem use este endereço para aceitar reservas reais.</p>}
      <h2 className="text-base font-semibold text-foreground">Dados tratados</h2>
      <p>O formulário de reserva pede nome, e-mail, telefone, datas, quarto e número de hóspedes. O painel da pousada apresenta estes dados à conta autenticada. A declaração de aceitação da política é registada na reserva pública.</p>
      <h2 className="text-base font-semibold text-foreground">Finalidade e partilha</h2>
      <p>Os dados são necessários para gerir a estadia e permitir o contacto entre a pousada e o hóspede. Mensagens de e-mail e WhatsApp são preparadas para revisão e envio manual pelo operador, através desses serviços externos. A exportação CSV coloca uma cópia dos dados no dispositivo do operador.</p>
      <h2 className="text-base font-semibold text-foreground">Direitos e conservação</h2>
      <p>Para pedir acesso, correção ou eliminação dos seus dados, contacte diretamente a pousada com quem fez a reserva. A conservação e a resposta a pedidos devem respeitar a LGPD e outras obrigações legais aplicáveis. Ainda não há eliminação automática de dados nesta versão.</p>
      <h2 className="text-base font-semibold text-foreground">Segurança</h2>
      <p>{isPhpBackend ? "O backend PHP usa sessões e separação de dados por pousada, ainda pendentes de validação num servidor MySQL real." : "O modo de demonstração guarda dados no navegador; o modo Supabase requer configuração e validação de políticas RLS antes de usar dados reais."} Não introduza dados reais em ambientes de ensaio ou demonstração.</p>
    </Shell>
  )
}

export function Termos() {
  return (
    <Shell titulo="Termos de utilização">
      <p>Informação para avaliação do serviço — não constitui oferta de subscrição nem substitui termos contratuais a aprovar antes de operação real.</p>
      {isPhpBackend && <p role="status">O painel PHP está em ensaio. Não receba hóspedes reais por esta instalação.</p>}
      <h2 className="text-base font-semibold text-foreground">Funcionalidades</h2>
      <p>{isPhpBackend ? "Esta versão inclui gestão reduzida de quartos, disponibilidade, reservas e contacto manual. Não dispõe de check-in por IA ou cobrança automática." : "As funcionalidades dependem do backend configurado. A demonstração local não partilha reservas entre dispositivos e não deve ser usada com hóspedes reais."}</p>
      <h2 className="text-base font-semibold text-foreground">Preços e pagamentos</h2>
      <p>Não existe faturação de subscrições ativa nesta instalação. A seleção de PIX ou cartão numa reserva não efetua cobrança. A pousada combina o pagamento diretamente com o hóspede; nenhuma reserva é marcada como paga só por ter sido criada ou confirmada.</p>
      <h2 className="text-base font-semibold text-foreground">Responsabilidades</h2>
      <p>A pousada deve manter dados e disponibilidade corretos, rever pedidos e comunicações e verificar pagamentos pelos seus próprios meios. É proibido usar o serviço para fins ilegais ou enviar spam.</p>
    </Shell>
  )
}
