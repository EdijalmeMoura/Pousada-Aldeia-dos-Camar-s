-- Cada pousada usa a sua InfiniteTag. A chave de API fica SOMENTE num secret do servidor.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS infinitepay_handle text NOT NULL DEFAULT '';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS checkout_url text NOT NULL DEFAULT '';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS pagamento_estado text NOT NULL DEFAULT 'nao_iniciado'
  CHECK (pagamento_estado IN ('nao_iniciado','aguarda_pagamento','pago'));
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS transaction_nsu text NOT NULL DEFAULT '';
-- Apenas o serviço pode alterar estado de pagamento: o dono gere o estado da estadia, não a liquidação.
REVOKE UPDATE ON public.reservas FROM authenticated;
GRANT UPDATE (nome_hospede, email, telefone, check_in, check_out, adultos, estado,
              metodo_pagamento, origem, updated_at) ON public.reservas TO authenticated;
-- O link de checkout pode ser lido apenas pelo dono via RLS; nunca pela API anónima.
