-- Quota diária de IA por conta, usada exclusivamente pela função de servidor.
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day date NOT NULL,
  calls integer NOT NULL DEFAULT 0 CHECK (calls >= 0),
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_usage TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE used integer;
BEGIN
  INSERT INTO public.ai_usage(user_id, day, calls) VALUES (p_user_id, (now() AT TIME ZONE 'UTC')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET calls = public.ai_usage.calls + 1
    WHERE public.ai_usage.calls < 100
  RETURNING calls INTO used;
  RETURN used IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid) TO service_role;
