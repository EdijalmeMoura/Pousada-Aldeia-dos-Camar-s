-- A conta que criou o link fica associada à reserva: alterar a InfiniteTag no perfil
-- não pode desviar nem invalidar a verificação de uma transação anterior.
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS checkout_handle text NOT NULL DEFAULT '';
-- Não permitir apagar reservas com pagamento confirmado (preservar reconciliação).
DROP POLICY IF EXISTS "reservas_delete" ON public.reservas;
CREATE POLICY "reservas_delete" ON public.reservas FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND pagamento_estado <> 'pago');
