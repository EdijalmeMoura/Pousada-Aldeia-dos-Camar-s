<?php
declare(strict_types=1);
require_once __DIR__ . '/availability.php';

/** Funções públicas: devolvem apenas dados de catálogo. Identificadores binários ficam internos. */
function publicPousada(PDO $db, string $slug): ?array {
    $query = $db->prepare('SELECT HEX(id) AS id, nome AS nome_pousada, slug FROM pousadas WHERE slug = ?');
    $query->execute([$slug]);
    return $query->fetch(PDO::FETCH_ASSOC) ?: null;
}

function publicRooms(PDO $db, string $slug): array {
    $query = $db->prepare('SELECT HEX(q.id) AS id, q.nome, q.capacidade, q.preco_base_centavos / 100 AS preco_base FROM quartos q JOIN pousadas p ON p.id = q.pousada_id WHERE p.slug = ? AND q.ativo = 1 ORDER BY q.nome');
    $query->execute([$slug]);
    return $query->fetchAll(PDO::FETCH_ASSOC);
}

function validateBooking(array $input, bool $manual = false): array {
    $slug = (string)($input['slug'] ?? '');
    $room = (string)($input['quarto_id'] ?? '');
    $start = (string)($input['check_in'] ?? '');
    $end = (string)($input['check_out'] ?? '');
    $name = trim((string)($input['nome_hospede'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $phone = trim((string)($input['telefone'] ?? ''));
    $adults = filter_var($input['adultos'] ?? null, FILTER_VALIDATE_INT);
    $payment = (string)($input['metodo_pagamento'] ?? '');
    $from = DateTimeImmutable::createFromFormat('!Y-m-d', $start);
    $to = DateTimeImmutable::createFromFormat('!Y-m-d', $end);
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) || strlen($slug) > 80
        || !preg_match('/^[0-9a-fA-F]{32}$/D', $room)
        || !$from || $from->format('Y-m-d') !== $start || !$to || $to->format('Y-m-d') !== $end
        || $from < new DateTimeImmutable('today') || $to <= $from || (int)$from->diff($to)->days > 90
        || mb_strlen($name) < 2 || mb_strlen($name) > 160
        || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254
        || strlen($phone) < 8 || strlen($phone) > 32
        || $adults === false || $adults < 1 || $adults > 50
        || !in_array($payment, ['pix', 'cartao'], true)
        || (!$manual && ($input['aceito_privacidade'] ?? null) !== true)) {
        throw new InvalidArgumentException('Dados da reserva inválidos ou consentimento em falta.');
    }
    return compact('slug', 'room', 'start', 'end', 'name', 'email', 'phone', 'adults', 'payment');
}

/** Bloqueia a linha do quarto para serializar reservas concorrentes daquele quarto. */
function createPublicBooking(PDO $db, array $input, bool $manual = false): array {
    $data = validateBooking($input, $manual);
    $db->beginTransaction();
    try {
        $room = $db->prepare('SELECT HEX(q.pousada_id) AS pousada_id, q.capacidade, q.preco_base_centavos FROM quartos q JOIN pousadas p ON p.id = q.pousada_id WHERE q.id = UNHEX(?) AND p.slug = ? AND q.ativo = 1 FOR UPDATE');
        $room->execute([$data['room'], $data['slug']]);
        $details = $room->fetch(PDO::FETCH_ASSOC);
        if (!$details || (int)$details['capacidade'] < $data['adults']) {
            throw new InvalidArgumentException('Quarto indisponível ou capacidade excedida.');
        }
        if (occupied($db, $details['pousada_id'], $data['room'], $data['start'], $data['end'])) {
            throw new DomainException('Quarto indisponível para estas datas.');
        }
        $nights = (new DateTimeImmutable($data['start']))->diff(new DateTimeImmutable($data['end']))->days;
        $total = $nights * (int)$details['preco_base_centavos'];
        if ($total <= 0 || $total > 2147483647) throw new DomainException('Preço inválido.');
        $code = 'HSP-' . strtoupper(bin2hex(random_bytes(6)));
        $insert = $db->prepare('INSERT INTO reservas (id, pousada_id, quarto_id, nome_hospede, email, telefone, check_in, check_out, adultos, estado, valor_total_centavos, consentimento_em, codigo_reserva, metodo_pagamento) VALUES (UNHEX(?), UNHEX(?), UNHEX(?), ?, ?, ?, ?, ?, ?, \'pendente\', ?, ?, ?, ?)');
        $insert->execute([bin2hex(random_bytes(16)), $details['pousada_id'], $data['room'], $data['name'], $data['email'], $data['phone'], $data['start'], $data['end'], $data['adults'], $total, $manual ? null : date('Y-m-d H:i:s'), $code, $data['payment']]);
        $db->commit();
        return ['codigo_reserva' => $code, 'valor_total' => $total / 100];
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}
