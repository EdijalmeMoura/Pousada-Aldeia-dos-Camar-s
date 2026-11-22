-- Aplicar após 001–005. Confirmação operacional não equivale a pagamento.
ALTER TABLE reservas ADD COLUMN confirmada_em TIMESTAMP NULL;
