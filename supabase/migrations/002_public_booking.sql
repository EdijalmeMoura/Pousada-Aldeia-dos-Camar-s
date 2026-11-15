-- API pública restrita: nunca expor profiles ou reservas diretamente a anónimos.
DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
DROP POLICY IF EXISTS "quartos_public_select" ON public.quartos;
DROP POLICY IF EXISTS "reservas_public_insert" ON public.reservas;
REVOKE ALL ON public.profiles, public.quartos, public.reservas FROM anon;

-- Só devolve campos públicos da pousada, nunca e-mail, WhatsApp ou dados de conta.
CREATE OR REPLACE FUNCTION public.public_pousada(p_slug text)
RETURNS TABLE(id uuid, nome_pousada text, slug text, cor text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, p.nome_pousada, p.slug, p.cor, p.logo_url
  FROM public.profiles p WHERE p.slug = p_slug AND p.onboarding_concluido = true
$$;

-- O código de acesso do quarto e o user_id não são divulgados ao público.
CREATE OR REPLACE FUNCTION public.public_quartos(p_slug text)
RETURNS TABLE(id uuid, nome text, descricao text, capacidade integer, preco_base numeric,
              comodidades text, foto_url text, ativo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT q.id, q.nome, q.descricao, q.capacidade, q.preco_base,
         q.comodidades, q.foto_url, q.ativo
  FROM public.quartos q JOIN public.profiles p ON p.id = q.user_id
  WHERE p.slug = p_slug AND p.onboarding_concluido = true AND q.ativo = true
$$;

-- Reserva atómica: preço e disponibilidade são verificados exclusivamente no servidor.
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

REVOKE ALL ON FUNCTION public.public_pousada(text), public.public_quartos(text),
  public.criar_reserva_publica(text,uuid,text,text,text,date,date,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_pousada(text), public.public_quartos(text),
  public.criar_reserva_publica(text,uuid,text,text,text,date,date,integer,text) TO anon, authenticated;

-- Protege também inserções feitas pelo proprietário fora da função pública.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.reservas ADD CONSTRAINT reservas_sem_sobreposicao
  EXCLUDE USING gist (quarto_id WITH =, daterange(check_in, check_out, '[)') WITH &&)
  WHERE (estado IN ('pendente', 'confirmada'));
