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

## Diagnóstico de segurança no Supabase

Depois de aplicar as migrações `001`–`013`, execute `supabase/tests/production_checks.sql` no SQL Editor. O script verifica RLS, permissões `anon`, funções RPC e restrições/triggers essenciais sem alterar dados. Não foi executado neste repositório: é necessário um projeto Supabase real. O resultado não substitui ensaios de isolamento com duas contas e um hóspede anónimo.

## Fotografias da pousada

A página pública só mostra fotografias explicitamente configuradas nos quartos; quando falta uma imagem ou o endereço está quebrado, mostra um estado neutro «Fotografia indisponível». Não apresenta fotos geradas como se fossem do alojamento. O banner público também não usa a imagem ilustrativa da landing. A carga de quartos/reservas de exemplo é exclusiva do modo local e é bloqueada quando o Supabase estiver configurado. Antes de divulgar um link real, cada pousada deve inserir fotografias próprias com autorização de utilização.

## Isolamento entre pousadas

Aplique `supabase/migrations/010_tenant_foreign_keys.sql` **após** a `009`. Chaves estrangeiras compostas impedem que tarifas, reservas e bloqueios de uma conta referenciem quartos de outra conta, e que um check-in referencie uma reserva alheia. Esta proteção complementa RLS: a política por `user_id` isoladamente não garante a propriedade da entidade associada. Se já houver dados inconsistentes, a migração falha intencionalmente; não os ignore, investigue e corrija antes de voltar a aplicar. O diagnóstico `supabase/tests/production_checks.sql` verifica a presença destas relações, mas o comportamento deve ser testado com duas contas reais.

## Registo e onboarding

O login pede apenas e-mail e palavra-passe; o nome pertence exclusivamente ao registo. `/onboarding` permite o acesso ao utilizador autenticado que ainda não concluiu a configuração, sem se redirecionar para si próprio. Quando Supabase Auth exigir confirmação de e-mail, o registo não assume que existe sessão: apresenta a indicação para confirmar a conta e iniciar sessão depois. No modo local, o botão de demonstração não é apresentado como OAuth Google real. Os testes verificam validação e destinos das rotas; o fluxo Supabase ainda precisa de teste com configuração de e-mail/OAuth no projeto real.

## Proteção da IA

Aplique `supabase/migrations/011_ai_quota.sql` depois da `010` e volte a publicar `ai-generate`. A função agora exige sessão Supabase válida, limita o tamanho dos pedidos e usa a quota atómica de 100 chamadas por conta e dia (UTC). Se a quota ou o serviço de IA não estiverem configurados, a função falha sem chamar o gateway. A chave `LOVABLE_API_KEY` permanece exclusivamente no servidor. A demonstração offline deixou de inventar códigos de acesso ou números de negócio; o operador deve verificar e enviar o código real do quarto. Isto não substitui revisão humana de dados sensíveis e respostas do modelo.

## Check-in assistido (envio manual)

A conversa de `/app/checkin` é uma **simulação operada pela pousada**, não um canal de chat do hóspede. A IA pode ajudar a preparar respostas, mas não envia mensagens automaticamente e não deve inventar códigos. Só reservas confirmadas podem iniciar o fluxo. Após verificar a identidade do hóspede, o operador prepara uma mensagem WhatsApp com o **código real configurado no quarto** e as regras da casa; deve conferir o destinatário e enviar manualmente. A sessão só fica concluída depois de o operador assinalar que enviou a mensagem. Isto não comprova entrega ou leitura pelo hóspede. Não exponha códigos em páginas públicas nem introduza dados sensíveis desnecessários nos prompts da IA.

## Declaração de privacidade na reserva pública

Aplique `supabase/migrations/012_public_consent.sql` após a `011`. O formulário público exige aceitação dos Termos e da Política de privacidade antes da reserva; a nova função `criar_reserva_publica_com_consentimento` rejeita pedidos sem aceitação e regista `consentimento_em` no servidor. A função pública anterior deixa de ser executável por anónimos; a criação interna da pousada continua separada e não é apresentada como consentimento do hóspede. Um booleano enviado pelo navegador não comprova identidade nem substitui revisão jurídica, informação transparente e gestão adequada de dados pessoais.

## Slugs públicos seguros

Aplique `supabase/migrations/013_reserved_slugs.sql` depois da `012`. O onboarding e as configurações rejeitam nomes que colidam com rotas internas (`/app`, `/login`, `/termos`, etc.) e mantêm links entre 3 e 40 caracteres. O botão **Copiar** partilha apenas o link já guardado, não um valor ainda por submeter. O banco mantém unicidade e a migração limita também o slug inicial gerado ao criar uma conta. Se existirem slugs antigos incompatíveis com a regra, reveja-os antes de aplicar a migração.
