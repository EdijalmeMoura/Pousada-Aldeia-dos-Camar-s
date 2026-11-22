<?php
declare(strict_types=1);

/** Todas as consultas operacionais derivam o tenant da sessão, nunca do corpo do pedido. */
function operation(PDO $db, string $action, array $config): array {
    require_once __DIR__ . '/auth.php';
    require_once __DIR__ . '/booking.php';
    $path = $config['cookie_path'] ?? '/edijalmemoura/hospedae/';
    startAuthSession($path);
    $account = currentAccount($db);
    if (!$account) throw new RuntimeException('Autenticação necessária.', 401);
    $tenant = $account['pousada_id'];
    if ($action === 'my-rooms') {
        $query = $db->prepare('SELECT HEX(id) AS id, nome, capacidade, preco_base_centavos / 100 AS preco_base, ativo, created_at FROM quartos WHERE pousada_id = UNHEX(?) ORDER BY created_at DESC');
        $query->execute([$tenant]);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    if ($action === 'my-bookings') {
        $query = $db->prepare('SELECT HEX(id) AS id, HEX(quarto_id) AS quarto_id, nome_hospede, email, telefone, check_in, check_out, adultos, estado, valor_total_centavos / 100 AS valor_total, codigo_reserva, metodo_pagamento, consentimento_em, created_at FROM reservas WHERE pousada_id = UNHEX(?) ORDER BY created_at DESC LIMIT 500');
        $query->execute([$tenant]);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    if ($action === 'my-blocks') {
        $query = $db->prepare('SELECT HEX(id) AS id, HEX(quarto_id) AS quarto_id, data_inicio, data_fim, motivo, created_at FROM bloqueios WHERE pousada_id = UNHEX(?) ORDER BY data_inicio DESC LIMIT 500');
        $query->execute([$tenant]);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
    requireSameOrigin($config['trusted_origin'] ?? '');
    $body = authBody();
    requireCsrf($body);
    if ($action === 'add-room') {
        $name = trim((string)($body['nome'] ?? ''));
        $capacity = filter_var($body['capacidade'] ?? null, FILTER_VALIDATE_INT);
        $price = filter_var($body['preco_base_centavos'] ?? null, FILTER_VALIDATE_INT);
        if (mb_strlen($name) < 2 || mb_strlen($name) > 160 || $capacity === false || $capacity < 1 || $capacity > 50
            || $price === false || $price < 100 || $price > 100000000) {
            throw new InvalidArgumentException('Dados do quarto inválidos.');
        }
        $id = bin2hex(random_bytes(16));
        $insert = $db->prepare('INSERT INTO quartos (id, pousada_id, nome, capacidade, preco_base_centavos) VALUES (UNHEX(?), UNHEX(?), ?, ?, ?)');
        $insert->execute([$id, $tenant, $name, $capacity, $price]);
        return ['id' => $id, 'nome' => $name];
    }
    if ($action === 'add-block') {
        $room = (string)($body['quarto_id'] ?? '');
        $start = (string)($body['data_inicio'] ?? '');
        $end = (string)($body['data_fim'] ?? '');
        $reason = trim((string)($body['motivo'] ?? ''));
        if (!preg_match('/^[0-9a-fA-F]{32}$/D', $room) || mb_strlen($reason) > 200) {
            throw new InvalidArgumentException('Bloqueio inválido.');
        }
        validStay($start, $end);
        $db->beginTransaction();
        try {
            $lock = $db->prepare('SELECT id FROM quartos WHERE pousada_id = UNHEX(?) AND id = UNHEX(?) FOR UPDATE');
            $lock->execute([$tenant, $room]);
            if (!$lock->fetchColumn()) throw new InvalidArgumentException('Quarto inexistente.');
            if (occupied($db, $tenant, $room, $start, $end)) throw new DomainException('O quarto já está ocupado ou bloqueado.');
            $id = bin2hex(random_bytes(16));
            $insert = $db->prepare('INSERT INTO bloqueios (id, pousada_id, quarto_id, data_inicio, data_fim, motivo) VALUES (UNHEX(?), UNHEX(?), UNHEX(?), ?, ?, ?)');
            $insert->execute([$id, $tenant, $room, $start, $end, $reason]);
            $db->commit();
            return ['id' => $id];
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            throw $error;
        }
    }
    if ($action === 'add-booking') {
        // A identidade da pousada e o slug são obtidos exclusivamente da sessão.
        $body['slug'] = $account['slug'];
        return createPublicBooking($db, $body, true);
    }
    throw new InvalidArgumentException('Operação indisponível.');
}
