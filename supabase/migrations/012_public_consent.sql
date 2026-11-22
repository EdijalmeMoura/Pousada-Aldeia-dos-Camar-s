-- A aceitação declarada pelo hóspede é registada apenas no percurso público.
-- Não equivale a prova de identidade; consulte aconselhamento jurídico para LGPD.
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS consentimento_em timestamptz;

CREATE OR REPLACE FUNCTION public.criar_reserva_publica_com_consentimento(
  p_slug text, p_quarto_id uuid, p_nome text, p_email text, p_telefone text,
  p_entrada date, p_saida date, p_adultos integer, p_metodo text, p_aceite boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF p_aceite IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'É necessário aceitar os termos e a política de privacidade.';
  END IF;
  result := public.criar_reserva_publica(p_slug, p_quarto_id, p_nome, p_email, p_telefone,
                                          p_entrada, p_saida, p_adultos, p_metodo);
  UPDATE public.reservas SET consentimento_em = now() WHERE id = (result->>'id')::uuid;
  RETURN result;
END;
$$;
-- Não existe caminho anónimo alternativo que não exija aceitação.
REVOKE EXECUTE ON FUNCTION public.criar_reserva_publica(text,uuid,text,text,text,date,date,integer,text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.criar_reserva_publica_com_consentimento(text,uuid,text,text,text,date,date,integer,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_reserva_publica_com_consentimento(text,uuid,text,text,text,date,date,integer,text,boolean) TO anon, authenticated;
