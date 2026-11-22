-- Aplicar depois de 001_core.sql numa base ainda sem reservas reais.
ALTER TABLE reservas
  ADD COLUMN codigo_reserva VARCHAR(24) NOT NULL UNIQUE,
  ADD COLUMN metodo_pagamento ENUM('pix','cartao') NOT NULL DEFAULT 'pix';
