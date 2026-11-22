-- Execute no SQL Editor do projeto Supabase, DEPOIS das migrações 001–010.
-- Leitura de catálogo apenas: não altera reservas, perfis ou outros dados.
DO $checks$
DECLARE
  table_name text;
  function_name text;
  missing text[] := ARRAY[]::text[];
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles','user_roles','quartos','tarifas','reservas','checkins','atividades','bloqueios'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = table_name AND c.relkind = 'r' AND c.relrowsecurity
    ) THEN missing := array_append(missing, 'RLS ausente: public.' || table_name); END IF;
  END LOOP;

  -- Anónimos nunca devem consultar tabelas de proprietários nem inserir reservas diretamente.
  FOREACH table_name IN ARRAY ARRAY[
    'profiles','user_roles','quartos','tarifas','reservas','checkins','atividades','bloqueios'
  ] LOOP
    IF has_table_privilege('anon', 'public.' || table_name, 'SELECT')
       OR has_table_privilege('anon', 'public.' || table_name, 'INSERT')
       OR has_table_privilege('anon', 'public.' || table_name, 'UPDATE')
       OR has_table_privilege('anon', 'public.' || table_name, 'DELETE') THEN
      missing := array_append(missing, 'Permissão direta a anon: public.' || table_name);
    END IF;
  END LOOP;

  FOREACH function_name IN ARRAY ARRAY[
    'public.public_pousada(text)',
    'public.public_quartos(text)',
    'public.cotar_reserva_publica(text,uuid,date,date,integer)',
    'public.criar_reserva_publica(text,uuid,text,text,text,date,date,integer,text)'
  ] LOOP
    IF to_regprocedure(function_name) IS NULL THEN
      missing := array_append(missing, 'Função pública ausente: ' || function_name);
    ELSIF NOT has_function_privilege('anon', function_name, 'EXECUTE') THEN
      missing := array_append(missing, 'Função não acessível a anon: ' || function_name);
    END IF;
  END LOOP;

  FOREACH function_name IN ARRAY ARRAY[
    'public.criar_reserva_proprietario(uuid,text,text,text,date,date,integer,text,text)',
    'public.cancelar_reserva(uuid,text)',
    'public.registar_reembolso_manual(uuid,text)'
  ] LOOP
    IF to_regprocedure(function_name) IS NULL THEN
      missing := array_append(missing, 'Função interna ausente: ' || function_name);
    ELSIF has_function_privilege('anon', function_name, 'EXECUTE') THEN
      missing := array_append(missing, 'Função interna acessível a anon: ' || function_name);
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_sem_sobreposicao' AND contype = 'x') THEN
    missing := array_append(missing, 'Restrição anti-sobreposição de reservas ausente');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bloqueios_sem_sobreposicao' AND contype = 'x') THEN
    missing := array_append(missing, 'Restrição anti-sobreposição de bloqueios ausente');
  END IF;
  -- As políticas RLS por user_id não bastam se uma FK apontar para o quarto de outra conta.
  FOREACH function_name IN ARRAY ARRAY[
    'tarifas_quarto_mesmo_proprietario',
    'reservas_quarto_mesmo_proprietario',
    'bloqueios_quarto_mesmo_proprietario',
    'checkins_reserva_mesmo_proprietario'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = function_name AND contype = 'f') THEN
      missing := array_append(missing, 'Relação de isolamento entre proprietários ausente: ' || function_name);
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'reservas' AND t.tgname = 'validar_cancelamento' AND NOT t.tgisinternal AND t.tgenabled <> 'D'
  ) THEN missing := array_append(missing, 'Trigger de cancelamento ausente ou desativado'); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'bloqueios' AND t.tgname = 'validar_bloqueio' AND NOT t.tgisinternal AND t.tgenabled <> 'D'
  ) THEN missing := array_append(missing, 'Trigger de bloqueio ausente ou desativado'); END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Diagnóstico falhou: %', array_to_string(missing, '; ');
  END IF;
  RAISE NOTICE 'Diagnóstico de esquema e permissões concluído. Continue com testes reais de RLS e pagamentos.';
END;
$checks$;
