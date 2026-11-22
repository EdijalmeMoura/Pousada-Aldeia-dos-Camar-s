-- Bloqueios de disponibilidade por quarto (datas de entrada incluídas, saída excluída).
CREATE TABLE IF NOT EXISTS public.bloqueios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  quarto_id uuid NOT NULL REFERENCES public.quartos ON DELETE CASCADE,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  motivo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (data_fim > data_inicio),
  UNIQUE (id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bloqueios_quarto_periodo ON public.bloqueios(quarto_id, data_inicio, data_fim);
ALTER TABLE public.bloqueios ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.bloqueios TO authenticated;
GRANT ALL ON public.bloqueios TO service_role;
CREATE POLICY "bloqueios_select" ON public.bloqueios FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "bloqueios_insert" ON public.bloqueios FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.quartos q WHERE q.id = quarto_id AND q.user_id = auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.reservas r WHERE r.quarto_id = quarto_id AND r.estado IN ('pendente','confirmada')
    AND r.check_in < data_fim AND r.check_out > data_inicio)
);
CREATE POLICY "bloqueios_delete" ON public.bloqueios FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.bloqueios ADD CONSTRAINT bloqueios_sem_sobreposicao
  EXCLUDE USING gist (quarto_id WITH =, daterange(data_inicio, data_fim, '[)') WITH &&);

-- A garantia final aplica-se a todas as inserções (públicas e do proprietário).
CREATE OR REPLACE FUNCTION public.validar_periodo_reserva()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.check_out <= NEW.check_in THEN RAISE EXCEPTION 'Data de saída inválida.'; END IF;
  IF NEW.estado IN ('pendente','confirmada') AND EXISTS (
    SELECT 1 FROM public.bloqueios b WHERE b.quarto_id = NEW.quarto_id
    AND b.data_inicio < NEW.check_out AND b.data_fim > NEW.check_in
  ) THEN RAISE EXCEPTION 'O quarto está bloqueado nesse período.'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validar_periodo_reserva BEFORE INSERT OR UPDATE OF check_in,check_out,quarto_id,estado
  ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.validar_periodo_reserva();

-- A cotação e criação recusam também datas bloqueadas.
CREATE OR REPLACE FUNCTION public.criar_reserva_publica(
  p_slug text, p_quarto_id uuid, p_nome text, p_email text, p_telefone text,
  p_entrada date, p_saida date, p_adultos integer, p_metodo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_quarto public.quartos%ROWTYPE;
  v_id uuid;
  v_codigo text;
  v_total numeric;
BEGIN
  IF p_entrada IS NULL OR p_saida IS NULL OR p_entrada < CURRENT_DATE OR
     p_saida <= p_entrada OR p_saida > p_entrada + 90 THEN
    RAISE EXCEPTION 'Escolha datas válidas (até 90 noites).';
  END IF;
  IF length(trim(coalesce(p_nome,''))) < 2 OR length(p_nome) > 120 OR
     length(coalesce(p_email,'')) > 254 OR p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR
     length(coalesce(p_telefone,'')) < 10 OR length(p_telefone) > 20 OR
     p_metodo NOT IN ('pix','cartao') THEN
    RAISE EXCEPTION 'Verifique os dados do hóspede.';
  END IF;
  -- Bloqueio da linha do quarto serializa pedidos concorrentes para a mesma unidade.
  SELECT q.* INTO v_quarto FROM public.quartos q JOIN public.profiles p ON p.id = q.user_id
  WHERE q.id = p_quarto_id AND q.ativo AND p.slug = p_slug AND p.onboarding_concluido
  FOR UPDATE OF q;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quarto indisponível.'; END IF;
  IF p_adultos < 1 OR p_adultos > v_quarto.capacidade THEN
    RAISE EXCEPTION 'Número de hóspedes acima da capacidade do quarto.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bloqueios b WHERE b.quarto_id = p_quarto_id
             AND b.data_inicio < p_saida AND b.data_fim > p_entrada) THEN
    RAISE EXCEPTION 'O quarto está bloqueado nesse período.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservas r WHERE r.quarto_id = p_quarto_id
             AND r.estado IN ('pendente','confirmada')
             AND r.check_in < p_saida AND r.check_out > p_entrada) THEN
    RAISE EXCEPTION 'Este quarto já está reservado nessas datas.';
  END IF;
  SELECT sum(COALESCE((SELECT t.preco_noite FROM public.tarifas t
                       WHERE t.quarto_id = p_quarto_id AND d.dia BETWEEN t.data_inicio AND t.data_fim
                       ORDER BY t.created_at DESC LIMIT 1), v_quarto.preco_base))
  INTO v_total FROM generate_series(p_entrada, p_saida - 1, interval '1 day') AS d(dia);
  IF v_total IS NULL OR v_total <= 0 THEN RAISE EXCEPTION 'Tarifa indisponível.'; END IF;
  v_codigo := 'HSP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  INSERT INTO public.reservas(user_id, quarto_id, nome_hospede, email, telefone,
                              check_in, check_out, adultos, metodo_pagamento, valor_total, codigo_reserva)
  VALUES(v_quarto.user_id, p_quarto_id, trim(p_nome), trim(p_email), trim(p_telefone),
         p_entrada, p_saida, p_adultos, p_metodo, v_total, v_codigo) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'codigo_reserva', v_codigo, 'valor_total', v_total);
END;
$$;

-- A cotação e criação recusam também datas bloqueadas.
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
  IF EXISTS (SELECT 1 FROM public.bloqueios b WHERE b.quarto_id = p_quarto_id
             AND b.data_inicio < p_saida AND b.data_fim > p_entrada) THEN
    RAISE EXCEPTION 'O quarto está bloqueado nesse período.';
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

-- Criação interna: reutiliza a verificação transacional de preços e conflitos da API pública.
CREATE OR REPLACE FUNCTION public.criar_reserva_proprietario(
  p_quarto_id uuid, p_nome text, p_email text, p_telefone text,
  p_entrada date, p_saida date, p_adultos integer, p_metodo text, p_origem text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_slug text; v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_origem NOT IN ('direta','plataforma') THEN
    RAISE EXCEPTION 'Operação não autorizada.';
  END IF;
  SELECT p.slug INTO v_slug FROM public.profiles p
  JOIN public.quartos q ON q.user_id = p.id
  WHERE q.id = p_quarto_id AND p.id = auth.uid();
  IF v_slug IS NULL THEN RAISE EXCEPTION 'Quarto não encontrado.'; END IF;
  v_result := public.criar_reserva_publica(v_slug,p_quarto_id,p_nome,p_email,p_telefone,
                                            p_entrada,p_saida,p_adultos,p_metodo);
  IF p_origem = 'plataforma' THEN
    UPDATE public.reservas SET origem = 'plataforma'
    WHERE id = (v_result->>'id')::uuid AND user_id = auth.uid();
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.criar_reserva_proprietario(uuid,text,text,text,date,date,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_reserva_proprietario(uuid,text,text,text,date,date,integer,text,text) TO authenticated;

-- Serializa bloqueios com a criação de reservas (ambos bloqueiam a linha do quarto).
CREATE OR REPLACE FUNCTION public.validar_bloqueio()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.quartos WHERE id = NEW.quarto_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.reservas r WHERE r.quarto_id = NEW.quarto_id
    AND r.estado IN ('pendente','confirmada')
    AND r.check_in < NEW.data_fim AND r.check_out > NEW.data_inicio) THEN
    RAISE EXCEPTION 'Já existe uma reserva nesse período.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validar_bloqueio BEFORE INSERT ON public.bloqueios
  FOR EACH ROW EXECUTE FUNCTION public.validar_bloqueio();
