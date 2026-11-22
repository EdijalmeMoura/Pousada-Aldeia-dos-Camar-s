-- Impede que o link de uma pousada colida com rotas da aplicação.
-- Se houver dados antigos incompatíveis, corrija-os antes de aplicar esta restrição.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_slug_usable CHECK (
  slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'
  AND slug NOT IN ('app','signup','login','onboarding','configuracoes',
                   'privacidade','termos','api','assets','images','favicon','robots','sitemap')
);

-- O slug inicial gerado pelo trigger também respeita o limite de 40 caracteres.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base_slug text;
BEGIN
  base_slug := trim(both '-' from left(regexp_replace(lower(COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))), '[^a-z0-9]+', '-', 'g'), 32));
  IF length(base_slug) < 3 THEN base_slug := 'pousada'; END IF;
  INSERT INTO public.profiles (id, nome, email, slug, trial_ends_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email,
          base_slug || '-' || substr(NEW.id::text, 1, 6), now() + interval '7 days')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
