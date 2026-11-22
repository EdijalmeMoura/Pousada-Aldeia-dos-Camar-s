-- Regista tentativas de entrada sem armazenar endereços IP ou e-mails em claro.
CREATE TABLE auth_attempts (
  identifier BINARY(32) PRIMARY KEY,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
