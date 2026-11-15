-- Dados para cobrança manual, visíveis apenas ao proprietário via RLS existente.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chave_pix text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS link_pagamento text NOT NULL DEFAULT '';
