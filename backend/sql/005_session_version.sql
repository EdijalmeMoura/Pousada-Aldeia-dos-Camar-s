-- Aplicar após 001–004. Sessões antigas sem versão devem iniciar sessão novamente.
ALTER TABLE accounts ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 1;
