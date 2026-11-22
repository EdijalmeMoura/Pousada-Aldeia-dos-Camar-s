-- Defesa em profundidade: API anónima acede apenas a RPCs públicas filtradas.
-- Em Supabase, privilégios por defeito do esquema public podem variar por projeto.
REVOKE ALL PRIVILEGES ON TABLE
  public.profiles, public.user_roles, public.quartos, public.tarifas,
  public.reservas, public.checkins, public.atividades, public.bloqueios
FROM anon;
