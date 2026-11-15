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

Sem variáveis Supabase, a app corre em **modo local** (localStorage) com todas as funcionalidades — ideal para demonstração. Para produção:

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
