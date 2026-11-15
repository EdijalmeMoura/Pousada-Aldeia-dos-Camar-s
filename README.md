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
