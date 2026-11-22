<?php
declare(strict_types=1);

function validStay(string $start, string $end, bool $future = true): int {
    $from = DateTimeImmutable::createFromFormat('!Y-m-d', $start);
    $to = DateTimeImmutable::createFromFormat('!Y-m-d', $end);
    if (!$from || $from->format('Y-m-d') !== $start || !$to || $to->format('Y-m-d') !== $end
        || ($future && $from < new DateTimeImmutable('today')) || $to <= $from
        || $from->diff($to)->days > 90) {
        throw new InvalidArgumentException('Datas inválidas (máximo 90 noites).');
    }
    return $from->diff($to)->days;
}

function occupied(PDO $db, string $tenant, string $room, string $start, string $end): bool {
    $busy = $db->prepare("SELECT 1 FROM reservas WHERE pousada_id = UNHEX(?) AND quarto_id = UNHEX(?) AND estado IN ('pendente', 'confirmada') AND check_in < ? AND check_out > ? LIMIT 1");
    $busy->execute([$tenant, $room, $end, $start]);
    $blocked = $db->prepare('SELECT 1 FROM bloqueios WHERE pousada_id = UNHEX(?) AND quarto_id = UNHEX(?) AND removido_em IS NULL AND data_inicio < ? AND data_fim > ? LIMIT 1');
    $blocked->execute([$tenant, $room, $end, $start]);
    // Executar sempre ambas as consultas antes de consumir o resultado.
    return (bool)$busy->fetchColumn() || (bool)$blocked->fetchColumn();
}

function quotePublic(PDO $db, string $slug, string $room, string $start, string $end, int $adults): array {
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) || strlen($slug) > 80
        || !preg_match('/^[0-9a-fA-F]{32}$/D', $room)) throw new InvalidArgumentException('Quarto inválido.');
    $nights = validStay($start, $end);
    $q = $db->prepare('SELECT HEX(q.pousada_id) AS tenant, q.capacidade, q.preco_base_centavos FROM quartos q JOIN pousadas p ON p.id = q.pousada_id WHERE p.slug = ? AND q.id = UNHEX(?) AND q.ativo = 1');
    $q->execute([$slug, $room]);
    $details = $q->fetch(PDO::FETCH_ASSOC);
    if (!$details || $adults < 1 || $adults > (int)$details['capacidade']
        || occupied($db, $details['tenant'], $room, $start, $end)) {
        throw new DomainException('Quarto indisponível para estas datas.');
    }
    $total = $nights * (int)$details['preco_base_centavos'];
    if ($total <= 0 || $total > 2147483647) throw new DomainException('Preço inválido.');
    // Cotação informativa: a disponibilidade é novamente verificada na transação de inserção.
    return ['valor_total' => $total / 100, 'noites' => $nights];
}
