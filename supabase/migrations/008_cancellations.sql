-- Cancelamentos auditáveis; este módulo não executa reembolsos na InfinitePay.
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS motivo_cancelamento text NOT NULL DEFAULT '';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS cancelada_em timestamptz;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS reembolso_estado text NOT NULL DEFAULT 'nao_aplicavel'
  CHECK (reembolso_estado IN ('nao_aplicavel','requer_analise','registado_manual'));
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS reembolso_referencia text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.cancelar_reserva(p_id uuid, p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.reservas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR length(trim(coalesce(p_motivo,''))) < 5 OR length(p_motivo) > 500 THEN
    RAISE EXCEPTION 'Indique um motivo de cancelamento com 5 a 500 caracteres.';
  END IF;
  SELECT * INTO v FROM public.reservas WHERE id = p_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
  IF v.estado NOT IN ('pendente','confirmada') THEN
    RAISE EXCEPTION 'Apenas reservas pendentes ou confirmadas podem ser canceladas.';
  END IF;
  IF v.pagamento_estado = 'aguarda_pagamento' AND v.checkout_url <> '' THEN
    RAISE EXCEPTION 'Existe um checkout InfinitePay ativo: verifique o estado junto do prestador antes de cancelar.';
  END IF;
  UPDATE public.reservas SET estado = 'cancelada', motivo_cancelamento = trim(p_motivo),
    cancelada_em = now(), reembolso_estado = CASE WHEN v.pagamento_estado = 'pago' THEN 'requer_analise' ELSE 'nao_aplicavel' END
  WHERE id = p_id;
  INSERT INTO public.atividades(user_id,tipo,descricao)
  VALUES (auth.uid(),'cancelamento',left('Reserva ' || v.codigo_reserva || ' cancelada: ' || trim(p_motivo), 500));
  RETURN jsonb_build_object('reembolso_estado', CASE WHEN v.pagamento_estado = 'pago' THEN 'requer_analise' ELSE 'nao_aplicavel' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.registar_reembolso_manual(p_id uuid, p_referencia text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.reservas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR length(trim(coalesce(p_referencia,''))) < 5 OR length(p_referencia) > 200 THEN
    RAISE EXCEPTION 'Indique a referência da operação de reembolso (5 a 200 caracteres).';
  END IF;
  SELECT * INTO v FROM public.reservas WHERE id = p_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v.estado <> 'cancelada' OR v.reembolso_estado <> 'requer_analise' THEN
    RAISE EXCEPTION 'Não existe reembolso pendente para esta reserva.';
  END IF;
  UPDATE public.reservas SET reembolso_estado = 'registado_manual', reembolso_referencia = trim(p_referencia) WHERE id = p_id;
  INSERT INTO public.atividades(user_id,tipo,descricao)
  VALUES (auth.uid(),'reembolso',left('Reembolso manual da reserva ' || v.codigo_reserva || ' registado: ' || trim(p_referencia), 500));
END;
$$;
REVOKE ALL ON FUNCTION public.cancelar_reserva(uuid,text), public.registar_reembolso_manual(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_reserva(uuid,text), public.registar_reembolso_manual(uuid,text) TO authenticated;

-- Impede que a atualização genérica de estado contorne o motivo e o aviso de reembolso.
CREATE OR REPLACE FUNCTION public.validar_cancelamento()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.estado = 'cancelada' AND OLD.estado <> 'cancelada' THEN
    IF length(trim(NEW.motivo_cancelamento)) < 5 OR NEW.cancelada_em IS NULL OR
       (OLD.pagamento_estado = 'pago' AND NEW.reembolso_estado <> 'requer_analise') OR
       (OLD.pagamento_estado = 'aguarda_pagamento' AND OLD.checkout_url <> '') THEN
      RAISE EXCEPTION 'Use o fluxo de cancelamento e verifique pagamentos ativos.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validar_cancelamento BEFORE UPDATE OF estado ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.validar_cancelamento();
