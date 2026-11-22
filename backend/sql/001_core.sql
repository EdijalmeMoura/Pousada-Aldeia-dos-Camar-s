-- MySQL 8 / MariaDB 10.6+, utf8mb4; executar uma vez numa base vazia.
-- Nunca importar dados de demonstração nem credenciais do navegador.
CREATE TABLE accounts (
  id BINARY(16) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pousadas (
  id BINARY(16) PRIMARY KEY,
  owner_id BINARY(16) NOT NULL UNIQUE,
  nome VARCHAR(160) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  whatsapp VARCHAR(32) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pousada_owner FOREIGN KEY (owner_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE quartos (
  id BINARY(16) PRIMARY KEY,
  pousada_id BINARY(16) NOT NULL,
  nome VARCHAR(160) NOT NULL,
  capacidade SMALLINT UNSIGNED NOT NULL,
  preco_base_centavos INT UNSIGNED NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quarto_pousada (pousada_id, id),
  CONSTRAINT fk_quarto_pousada FOREIGN KEY (pousada_id) REFERENCES pousadas(id)
) ENGINE=InnoDB;

CREATE TABLE reservas (
  id BINARY(16) PRIMARY KEY,
  pousada_id BINARY(16) NOT NULL,
  quarto_id BINARY(16) NOT NULL,
  nome_hospede VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  telefone VARCHAR(32) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adultos SMALLINT UNSIGNED NOT NULL,
  estado ENUM('pendente','confirmada','cancelada','concluida') NOT NULL DEFAULT 'pendente',
  valor_total_centavos INT UNSIGNED NOT NULL,
  consentimento_em TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_reserva_datas CHECK (check_out > check_in),
  CONSTRAINT ck_reserva_adultos CHECK (adultos > 0),
  CONSTRAINT fk_reserva_pousada FOREIGN KEY (pousada_id) REFERENCES pousadas(id),
  CONSTRAINT fk_reserva_quarto_pousada FOREIGN KEY (pousada_id, quarto_id) REFERENCES quartos(pousada_id, id),
  KEY idx_disponibilidade (pousada_id, quarto_id, estado, check_in, check_out)
) ENGINE=InnoDB;

CREATE TABLE bloqueios (
  id BINARY(16) PRIMARY KEY,
  pousada_id BINARY(16) NOT NULL,
  quarto_id BINARY(16) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  motivo VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_bloqueio_datas CHECK (data_fim > data_inicio),
  CONSTRAINT fk_bloqueio_quarto_pousada FOREIGN KEY (pousada_id, quarto_id) REFERENCES quartos(pousada_id, id),
  KEY idx_bloqueios (pousada_id, quarto_id, data_inicio, data_fim)
) ENGINE=InnoDB;
