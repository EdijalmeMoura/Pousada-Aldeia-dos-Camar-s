-- Hospedaê — Schema completo (Lovable Cloud / Postgres)
-- Reserva direta sem comissão + check-in conversacional por IA

-- ============ TIPOS ============
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ FUNÇÕES AUXILIARES ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  plano text NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz,
  nome_pousada text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  whatsapp text NOT NULL DEFAULT '',
  cor text NOT NULL DEFAULT '#0891b2',
  logo_url text NOT NULL DEFAULT '',
  onboarding_concluido boolean NOT NULL DEFAULT false,
  regras_casa text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ============ DOMÍNIO ============
CREATE TABLE IF NOT EXISTS public.quartos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  capacidade int NOT NULL DEFAULT 2,
  preco_base numeric NOT NULL DEFAULT 0,
  comodidades text NOT NULL DEFAULT '',
  foto_url text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  codigo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tarifas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  quarto_id uuid NOT NULL REFERENCES public.quartos ON DELETE CASCADE,
  temporada text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  preco_noite numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  quarto_id uuid NOT NULL REFERENCES public.quartos ON DELETE CASCADE,
  nome_hospede text NOT NULL,
  email text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  check_in date NOT NULL,
  check_out date NOT NULL,
  adultos int NOT NULL DEFAULT 2,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','confirmada','cancelada','concluida')),
  metodo_pagamento text NOT NULL DEFAULT 'pix' CHECK (metodo_pagamento IN ('pix','cartao')),
  valor_total numeric NOT NULL DEFAULT 0,
  codigo_reserva text NOT NULL UNIQUE,
  origem text NOT NULL DEFAULT 'direta' CHECK (origem IN ('direta','plataforma')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reserva_id uuid NOT NULL REFERENCES public.reservas ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'em_curso',
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  codigo_quarto text NOT NULL DEFAULT '',
  regras_enviadas boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ÍNDICES ============
CREATE INDEX IF NOT EXISTS idx_quartos_user ON public.quartos (user_id);
CREATE INDEX IF NOT EXISTS idx_tarifas_user ON public.tarifas (user_id);
CREATE INDEX IF NOT EXISTS idx_tarifas_quarto ON public.tarifas (quarto_id);
CREATE INDEX IF NOT EXISTS idx_reservas_user ON public.reservas (user_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON public.reservas (estado);
CREATE INDEX IF NOT EXISTS idx_reservas_checkin ON public.reservas (check_in);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins (user_id);
CREATE INDEX IF NOT EXISTS idx_atividades_user ON public.atividades (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles (slug);

-- ============ TRIGGERS ============
DROP TRIGGER IF EXISTS tg_set_updated_at_profiles ON public.profiles;
CREATE TRIGGER tg_set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS tg_set_updated_at_quartos ON public.quartos;
CREATE TRIGGER tg_set_updated_at_quartos BEFORE UPDATE ON public.quartos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS tg_set_updated_at_tarifas ON public.tarifas;
CREATE TRIGGER tg_set_updated_at_tarifas BEFORE UPDATE ON public.tarifas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS tg_set_updated_at_reservas ON public.reservas;
CREATE TRIGGER tg_set_updated_at_reservas BEFORE UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS tg_set_updated_at_checkins ON public.checkins;
CREATE TRIGGER tg_set_updated_at_checkins BEFORE UPDATE ON public.checkins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS tg_set_updated_at_atividades ON public.atividades;
CREATE TRIGGER tg_set_updated_at_atividades BEFORE UPDATE ON public.atividades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: cria profile + role no registo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, slug, trial_ends_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email,
          lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), '[^a-z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 6),
          now() + interval '7 days')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS + GRANTS + POLICIES ============
-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quartos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quartos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarifas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.quartos TO service_role;
GRANT ALL ON public.tarifas TO service_role;
GRANT ALL ON public.reservas TO service_role;
GRANT ALL ON public.checkins TO service_role;
GRANT ALL ON public.atividades TO service_role;

-- profiles: dono ou admin
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- user_roles: leitura própria, escrita só via service_role/admin
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- quartos: dono ou admin + leitura pública por slug (link direto)
CREATE POLICY "quartos_select" ON public.quartos FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "quartos_insert" ON public.quartos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "quartos_update" ON public.quartos FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid());
CREATE POLICY "quartos_delete" ON public.quartos FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "quartos_public_select" ON public.quartos FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id));

-- tarifas: dono ou admin
CREATE POLICY "tarifas_select" ON public.tarifas FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tarifas_insert" ON public.tarifas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tarifas_update" ON public.tarifas FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tarifas_delete" ON public.tarifas FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- reservas: dono ou admin + inserção pública via link direto (anon)
CREATE POLICY "reservas_select" ON public.reservas FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reservas_insert" ON public.reservas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reservas_update" ON public.reservas FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reservas_delete" ON public.reservas FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reservas_public_insert" ON public.reservas FOR INSERT TO anon WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id));

-- checkins: dono ou admin
CREATE POLICY "checkins_select" ON public.checkins FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "checkins_insert" ON public.checkins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "checkins_update" ON public.checkins FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid());
CREATE POLICY "checkins_delete" ON public.checkins FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- atividades: dono ou admin
CREATE POLICY "atividades_select" ON public.atividades FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "atividades_insert" ON public.atividades FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "atividades_update" ON public.atividades FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid());
CREATE POLICY "atividades_delete" ON public.atividades FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- profiles público: leitura por slug para o link direto
CREATE POLICY "profiles_public_select" ON public.profiles FOR SELECT TO anon USING (true);
