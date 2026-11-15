-- Cotação pública sem expor reservas, dados pessoais nem tarifas internas.
CREATE OR REPLACE FUNCTION public.cotar_reserva_publica(
  p_slug text, p_quarto_id uuid, p_entrada date, p_saida date, p_adultos integer
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_quarto public.quartos%ROWTYPE; v_total numeric;
BEGIN
  IF p_entrada IS NULL OR p_saida IS NULL OR p_entrada < CURRENT_DATE OR
     p_saida <= p_entrada OR p_saida > p_entrada + 90 THEN
    RAISE EXCEPTION 'Escolha datas futuras válidas (até 90 noites).';
  END IF;
  SELECT q.* INTO v_quarto FROM public.quartos q JOIN public.profiles p ON p.id = q.user_id
  WHERE q.id = p_quarto_id AND q.ativo AND p.slug = p_slug AND p.onboarding_concluido;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quarto indisponível.'; END IF;
  IF p_adultos < 1 OR p_adultos > v_quarto.capacidade THEN
    RAISE EXCEPTION 'O número de hóspedes excede a capacidade do quarto.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservas r WHERE r.quarto_id = p_quarto_id
    AND r.estado IN ('pendente','confirmada') AND r.check_in < p_saida AND r.check_out > p_entrada) THEN
    RAISE EXCEPTION 'Este quarto já está reservado nessas datas.';
  END IF;
  SELECT sum(COALESCE((SELECT t.preco_noite FROM public.tarifas t
                       WHERE t.quarto_id = p_quarto_id AND d.dia BETWEEN t.data_inicio AND t.data_fim
                       ORDER BY t.created_at DESC LIMIT 1), v_quarto.preco_base))
  INTO v_total FROM generate_series(p_entrada, p_saida - 1, interval '1 day') AS d(dia);
  RETURN jsonb_build_object('valor_total', v_total, 'noites', p_saida - p_entrada);
END;
$$;
REVOKE ALL ON FUNCTION public.cotar_reserva_publica(text,uuid,date,date,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cotar_reserva_publica(text,uuid,date,date,integer) TO anon, authenticated;
