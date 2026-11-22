-- Isolamento relacional: user_id e entidade referenciada pertencem SEMPRE ao mesmo proprietário.
-- A migração falha se já houver dados cruzados; investigue-os antes de corrigir/apagar.
ALTER TABLE public.quartos ADD CONSTRAINT quartos_id_user_unique UNIQUE (id, user_id);
ALTER TABLE public.reservas ADD CONSTRAINT reservas_id_user_unique UNIQUE (id, user_id);

ALTER TABLE public.tarifas ADD CONSTRAINT tarifas_quarto_mesmo_proprietario
  FOREIGN KEY (quarto_id, user_id) REFERENCES public.quartos (id, user_id) ON DELETE CASCADE;
ALTER TABLE public.reservas ADD CONSTRAINT reservas_quarto_mesmo_proprietario
  FOREIGN KEY (quarto_id, user_id) REFERENCES public.quartos (id, user_id) ON DELETE CASCADE;
ALTER TABLE public.bloqueios ADD CONSTRAINT bloqueios_quarto_mesmo_proprietario
  FOREIGN KEY (quarto_id, user_id) REFERENCES public.quartos (id, user_id) ON DELETE CASCADE;
ALTER TABLE public.checkins ADD CONSTRAINT checkins_reserva_mesmo_proprietario
  FOREIGN KEY (reserva_id, user_id) REFERENCES public.reservas (id, user_id) ON DELETE CASCADE;
