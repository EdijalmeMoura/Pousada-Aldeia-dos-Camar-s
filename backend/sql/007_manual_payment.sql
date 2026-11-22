-- Apenas dados de cobrança manual por pousada; NUNCA chaves de API ou segredos InfinitePay.
ALTER TABLE pousadas
  ADD COLUMN chave_pix VARCHAR(140) NOT NULL DEFAULT '',
  ADD COLUMN link_pagamento VARCHAR(1024) NOT NULL DEFAULT '';
