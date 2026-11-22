-- Aplicar após 001–003, antes de publicar operações de cancelamento.
ALTER TABLE reservas
  ADD COLUMN cancelada_em TIMESTAMP NULL,
  ADD COLUMN motivo_cancelamento VARCHAR(500) NULL;

ALTER TABLE bloqueios
  ADD COLUMN removido_em TIMESTAMP NULL;
