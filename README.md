# Hospedaê

Reserva direta sem taxa de plataforma e check-in conversacional por IA para pousadas pequenas e aluguéis de temporada.

## Fluxo principal

1. **Pousada cadastra quartos e tarifas** → calendário e tarifas por temporada (`/app/quartos`)
2. **Hóspede reserva direto pelo link** → sem taxa, pagamento PIX/cartão (`/<slug>`)
3. **Check-in conversacional por IA** → coleta dados, envia regras e código do quarto (`/app/checkin`)

## Stack

React 18 + Vite + TypeScript · Tailwind CSS v3 (tokens HSL em `src/index.css`) · shadcn/ui · React Router v6 · Supabase (Lovable Cloud) · TanStack Query · React Hook Form + Zod · date-fns (ptPT) · lucide-react · Sonner · Lovable AI Gateway (`google/gemini-2.5-flash` via edge function `ai-generate`).

## Como correr

```bash
npm install
npm run dev
```

Sem variáveis Supabase, a app corre em **modo local** (localStorage) apenas para demonstração; os dados não são partilhados entre dispositivos. Para produção:

1. Crie o projeto no Lovable Cloud / Supabase.
2. Aplique `supabase/migrations/001_schema.sql` (tabelas, RLS, GRANTs, triggers).
3. Faça deploy da edge function `supabase/functions/ai-generate` com o secret `LOVABLE_API_KEY`.
4. Configure Google OAuth no painel de Auth.
5. Defina no `.env`:

```env
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Estrutura

- `src/pages/` — Landing, Login/Signup, Onboarding (3 telas), Dashboard (KPIs reais), Quartos/Tarifas, Reservas, Check-in IA, Configurações, reserva pública `/<slug>`, Privacidade, Termos, 404
- `src/lib/` — `supabase.ts` (cliente + WhatsApp), `db.ts` (camada dual Supabase/local), `ai.ts` (gateway + fallback offline)
- `supabase/` — migração SQL com RLS e edge function de IA

## Notas

- RLS em todas as tabelas: políticas escopadas por `user_id = auth.uid()` (ou `has_role` para admin); leitura pública por slug para o link direto.
- IA nunca pede API key ao utilizador: passa sempre pela edge function `ai-generate`.
- Toasts em todas as ações async; skeletons em todos os fetches; empty states ilustrados em todas as listas vazias.

## Reserva pública segura

Aplique **também** `supabase/migrations/002_public_booking.sql` após a migração inicial. Esta migração revoga a leitura anónima das tabelas, expõe apenas campos públicos através de funções RPC e cria reservas com preço calculado e disponibilidade verificada na base de dados (bloqueio transacional + restrição anti-sobreposição). Se já existirem reservas sobrepostas, corrija-as antes de aplicar a restrição.

**Pagamentos:** a opção PIX/cartão regista apenas uma preferência; não há cobrança automática. Não anuncie pagamento integrado antes de configurar um prestador de pagamentos e webhooks. O modo local não oferece garantias de concorrência nem persistência partilhada.

## Cotação e testes

Aplique também `supabase/migrations/003_public_quote.sql` para apresentar o total com tarifas de temporada e disponibilidade antes de confirmar. O servidor volta a verificar tudo ao criar a reserva; uma cotação não garante disponibilidade futura. Execute `npm test` para validar datas, capacidade, tarifa sazonal e reservas sobrepostas no modo local. Estes testes **não substituem** ensaios contra uma instância Supabase com as migrações aplicadas.

## Cobrança manual

Aplique `supabase/migrations/004_manual_payment.sql` após as migrações anteriores. Em **Configurações → Integrações**, o proprietário pode guardar uma chave PIX e/ou link HTTPS de pagamento; estes dados só são visíveis na área autenticada. Em **Reservas**, o botão WhatsApp abre uma mensagem pré-preenchida dirigida ao número do **hóspede** (não a envia automaticamente). O proprietário deve verificar o pagamento no prestador ou extrato antes de alterar o estado da reserva. Nunca introduza dados de cartão nesta aplicação. O link reutilizável só deve ser configurado se o prestador permitir o mesmo link para qualquer valor; caso contrário, crie e envie um link individual fora da aplicação.

Integração com InfinitePay e confirmação automática por webhook ainda **não** estão implementadas.

## InfinitePay por pousada (checkout opcional)

Aplique `supabase/migrations/005_infinitepay.sql`, publique as funções `infinitepay-checkout` e `infinitepay-webhook` e mantenha a cobrança manual como alternativa. A função do webhook **tem de** ser publicada com `verify_jwt = false` (ver `supabase/config.toml`); o endpoint do checkout mantém autenticação obrigatória. O responsável pela implantação configura `PUBLIC_SITE_URL` (origem HTTPS do site) e o secret **do servidor** `INFINITEPAY_MERCHANT_KEYS`, um objeto JSON cujas chaves são os IDs dos proprietários e cujos valores são as chaves InfinitePay dessas contas. Exemplo de formato, sem valores reais: `{ "<uuid-do-proprietário>": "<chave-guardada-no-servidor>" }`. Nunca coloque chaves em `VITE_*`, no perfil da pousada, no repositório ou nesta conversa. A InfiniteTag pública da conta é editável em **Configurações → Integrações**.

O proprietário gera o link na página Reservas, copia-o e envia-o ao hóspede. O valor é lido da reserva na base de dados e convertido em centavos no servidor. O link é de pagamento único; o webhook consulta `payment_check` e só marca como **Pago (verificado)** quando o prestador confirma e o valor coincide. A reserva de estadia continua a ser confirmada pelo proprietário. A InfinitePay não tem sandbox: não publique nem teste transações reais sem uma conta ativa e um plano de ensaio de baixo valor. O fluxo não foi ensaiado contra uma conta InfinitePay real neste repositório. Reembolsos, expiração e reconciliação de erros de rede continuam a exigir processos operacionais.

## Verificação antes de ativar a InfinitePay

Aplique também `supabase/migrations/006_payment_safety.sql` **depois** da `005`: fixa a InfiniteTag usada em cada checkout e impede a remoção de reservas com pagamento verificado. O CI em `.github/workflows/ci.yml` executa testes e build a cada push/PR. Os testes de pagamento cobrem regras puras de valor, confirmação e URL, mas **não** substituem testes das funções Deno e do webhook com uma conta real. Para um ensaio operacional, teste com uma compra real de baixo valor na conta da própria pousada, confirme o estado `Pago (verificado)` na reserva e confronte-o com o extrato InfinitePay antes de abrir o checkout ao público. Não confirme pagamentos apenas pelo redirecionamento do navegador.

## Publicar numa hospedagem simples (Apache/cPanel)

1. Execute `npm ci --legacy-peer-deps`, `npm test` e `npm run build` na sua máquina ou no CI.
2. Envie **o conteúdo** de `dist/` (incluindo o ficheiro oculto `.htaccess`) para a pasta pública do domínio, normalmente `public_html/`. Não envie `src/`, `node_modules/`, `.env` ou chaves privadas.
3. O `.htaccess` encaminha rotas como `/login`, `/app` e `/<slug>` para `index.html` quando o caminho não corresponde a um ficheiro; confirme que o alojamento Apache tem `mod_rewrite` e `AllowOverride` ativos. Se usar Nginx, configure `try_files $uri $uri/ /index.html;` no servidor.
4. No ambiente **antes do build**, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave pública do cliente) para ligar o frontend ao Supabase. O Vite incorpora estes valores no JavaScript gerado; mudar variáveis no alojamento depois do build não altera o site. Não coloque chaves `service_role`, API keys InfinitePay nem `LOVABLE_API_KEY` no frontend.
5. Publique as migrações SQL e edge functions no projeto Supabase **separado**. Configure os segredos apenas nas edge functions. A hospedagem de ficheiros estáticos não executa Postgres, autenticação, webhooks ou funções Deno.
6. Verifique `/`, `/login`, `/app` e o link público após atualizar a página. Sem Supabase, o site funciona apenas como **demonstração local por navegador**, não como sistema partilhado para receber reservas reais.

Se a hospedagem não permitir `.htaccess` ou uma regra de fallback para `index.html`, as rotas diretas da aplicação poderão devolver 404; nesse caso, peça ao fornecedor essa configuração ou escolha um serviço de hospedagem estática com suporte a SPA.

## Calendário e bloqueios

Aplique `supabase/migrations/007_calendar_blocks.sql` depois da `006`. Em **/app/calendario** a pousada consulta reservas por quarto, bloqueia períodos (saída exclusiva) para manutenção/uso privado e remove bloqueios. A API pública recusa cotação e criação sobre datas bloqueadas; a migração impede também reservas inseridas fora da API pública e valida conflitos na criação interna do proprietário, incluindo tarifa de temporada e lotação. O bloqueio e as reservas públicas usam a mesma linha do quarto para serializar operações concorrentes. Os testes locais (`npm test`) cobrem bloqueios e datas adjacentes. Esta migração ainda deve ser aplicada e ensaiada numa instância Supabase antes de aceitar reservas reais.

## Exportação de reservas

Na página **Reservas**, o proprietário pode descarregar CSV filtrado por data de entrada e estado, para gestão e reconciliação. O ficheiro é gerado no navegador com os dados já autorizados para a conta; não é enviado a serviços terceiros. As células de texto são protegidas contra fórmulas de folhas de cálculo. O CSV contém dados pessoais: guarde-o em local seguro e elimine cópias de que já não necessita. Reservas marcadas como **Pago (verificado)** não podem ser eliminadas pela interface nem pela política de base de dados da migração `006_payment_safety.sql`.

## Confirmação de estadia (envio manual)

Quando a pousada define uma reserva como confirmada, a página **Reservas** disponibiliza uma confirmação em `/app/reservas/:id/confirmacao`. Pode imprimi-la ou preparar uma mensagem por e-mail/WhatsApp para o hóspede. O documento só existe para reservas confirmadas ou concluídas, indica separadamente se o pagamento foi verificado e **não é recibo fiscal nem comprovativo do prestador**. Não existe envio automático: o operador revê e envia a mensagem na aplicação escolhida. A rota exige sessão do proprietário e a consulta respeita RLS no Supabase.

## Relatórios operacionais

Em `/app/relatorios`, o proprietário consulta reservas com entrada no mês, origem, cancelamentos, noites disponíveis (descontando bloqueios), noites ocupadas por estadias confirmadas/concluídas e pagamentos verificados. **Valor reservado não equivale a dinheiro recebido**: apenas reservas com `pagamento_estado = pago` entram no indicador de pagamentos verificados. O painel principal foi alinhado com essa distinção. Noites ocupadas contam no mês em que ocorrem, ainda que a entrada tenha sido no mês anterior; valores são atribuídos ao mês de entrada, não necessariamente à data de recebimento. Reembolsos e conciliação contabilística não são automatizados.

## Cancelamento e reembolso manual

Aplique `supabase/migrations/008_cancellations.sql` depois da `007`. Reservas pendentes/confirmadas podem ser canceladas com motivo registado no histórico. Se o pagamento estiver verificado, aparece **Reembolso por analisar**: a aplicação **não** devolve dinheiro. Depois de efetuar e verificar a operação diretamente na InfinitePay/banco, o proprietário pode registar a referência como **Reembolso registado manualmente**. Um checkout InfinitePay ativo e ainda não pago impede o cancelamento pela aplicação, pois o link pode continuar a aceitar pagamentos; confirme a situação no prestador. O CSV inclui motivo e referência. Não apague reservas pagas nem considere um cancelamento prova de reembolso. Antes de usar em produção, teste estas regras e a migração numa instância Supabase real.

## Conteúdo público e segurança da demonstração

A landing não apresenta depoimentos, avaliações ou métricas de clientes que não foram verificados. Os planos estão identificados como indicativos; a faturação de subscrições não está ativa. Sem Supabase, login e registo são apenas uma demonstração: os novos registos guardam um hash PBKDF2 com salt em vez de palavras-passe em claro; contas locais antigas são migradas depois de um início de sessão válido. Isto **não torna o localStorage uma autenticação segura**: qualquer pessoa com acesso ao mesmo navegador pode manipular os dados, e scripts no mesmo domínio podem aceder ao armazenamento. Não use palavras-passe pessoais ou dados reais de hóspedes neste modo. Para produção, configure Supabase Auth e RLS e teste isolamento de contas.

## Pré-publicação na Hostinger

Consulte [docs/DEPLOY-HOSTINGER.md](docs/DEPLOY-HOSTINGER.md) para a sequência Supabase → build → Hostinger → testes. Use `npm run build:production` para impedir que um build sem URL e chave **pública** de Supabase seja publicado como se fosse uma aplicação operacional. O build de demonstração (`npm run build`) continua disponível sem Supabase. O pré-voo é testado com `npm run test:deploy` e executado no CI; não substitui testes de migrações, RLS e pagamento numa instância real. Ficheiros `.env.*` locais são ignorados pelo Git, exceto `.env.example`.
