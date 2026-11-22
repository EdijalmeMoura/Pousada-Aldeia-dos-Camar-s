<?php
declare(strict_types=1);

/** Executar só por PHP CLI, numa base descartável já migrada, nunca via browser. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (getenv('RUN_PHP_INTEGRATION') !== 'I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE') {
    fwrite(STDERR, "Bloqueado: defina RUN_PHP_INTEGRATION=I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE\n");
    exit(2);
}
$path = getenv('HOSPEDAE_TEST_CONFIG_PATH');
if (!$path || !is_file($path) || !str_ends_with($path, '.php')) {
    fwrite(STDERR, "Forneça HOSPEDAE_TEST_CONFIG_PATH fora do diretório público.\n");
    exit(2);
}
$config = require $path;
if (!is_array($config) || ($config['environment'] ?? '') !== 'staging' || !preg_match('/(?:^|_)test(?:_|$)/i', (string)($config['database'] ?? ''))) {
    fwrite(STDERR, "O nome da base de ensaio deve incluir o segmento test. Não usar produção.\n");
    exit(2);
}
require __DIR__ . '/../public/api/booking.php';
$db = new PDO('mysql:host=' . $config['host'] . ';dbname=' . $config['database'] . ';charset=utf8mb4',
    $config['user'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
require __DIR__ . '/../public/api/clock.php';
configureClock($db, $config);
if ((int)$db->query('SELECT COUNT(*) FROM accounts')->fetchColumn() !== 0) {
    fwrite(STDERR, "A base não está vazia. Use uma base descartável sem contas.\n");
    exit(2);
}
function assertTest(bool $condition, string $description): void {
    if (!$condition) throw new RuntimeException('FALHOU: ' . $description);
    echo "OK: $description\n";
}
function insertTest(PDO $db, string $sql, array $params): void {
    $query = $db->prepare($sql);
    $query->execute($params);
}
$owners = [bin2hex(random_bytes(16)), bin2hex(random_bytes(16))];
$tenants = [bin2hex(random_bytes(16)), bin2hex(random_bytes(16))];
$rooms = [bin2hex(random_bytes(16)), bin2hex(random_bytes(16))];
$slugs = ['test-' . bin2hex(random_bytes(6)), 'test-' . bin2hex(random_bytes(6))];
$start = (new DateTimeImmutable('tomorrow'))->format('Y-m-d');
$end = (new DateTimeImmutable('tomorrow +2 days'))->format('Y-m-d');
$next = (new DateTimeImmutable('tomorrow +3 days'))->format('Y-m-d');
$blockId = bin2hex(random_bytes(16));
try {
    foreach ([0, 1] as $i) {
        insertTest($db, 'INSERT INTO accounts (id, email, password_hash) VALUES (UNHEX(?), ?, ?)',
            [$owners[$i], $slugs[$i] . '@example.invalid', password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT)]);
        insertTest($db, 'INSERT INTO pousadas (id, owner_id, nome, slug) VALUES (UNHEX(?), UNHEX(?), ?, ?)',
            [$tenants[$i], $owners[$i], 'Pousada de ensaio ' . $i, $slugs[$i]]);
        insertTest($db, 'INSERT INTO quartos (id, pousada_id, nome, capacidade, preco_base_centavos) VALUES (UNHEX(?), UNHEX(?), ?, ?, ?)',
            [$rooms[$i], $tenants[$i], 'Quarto de ensaio', 2, 12500]);
    }
    assertTest(publicPousada($db, $slugs[0])['slug'] === $slugs[0], 'pousada pública por slug');
    assertTest(count(publicRooms($db, $slugs[0])) === 1, 'catálogo separado por pousada');
    assertTest(publicRooms($db, $slugs[0])[0]['id'] === strtoupper($rooms[0]), 'quarto correto no catálogo');
    $input = [
        'slug' => $slugs[0], 'quarto_id' => $rooms[0], 'nome_hospede' => 'Hóspede Ensaio',
        'email' => 'hospede@example.invalid', 'telefone' => '81999999999',
        'check_in' => $start, 'check_out' => $end, 'adultos' => 2,
        'metodo_pagamento' => 'pix', 'aceito_privacidade' => true,
    ];
    $quote = quotePublic($db, $slugs[0], $rooms[0], $start, $end, 2);
    assertTest($quote['valor_total'] === 250.0 && $quote['noites'] === 2, 'cotação calculada no servidor');
    $booking = createPublicBooking($db, $input);
    assertTest($booking['valor_total'] === 250.0, 'reserva pública e preço do servidor');
    $consent = $db->prepare('SELECT consentimento_em FROM reservas WHERE codigo_reserva = ?');
    $consent->execute([$booking['codigo_reserva']]);
    assertTest($consent->fetchColumn() !== null, 'aceitação pública guardada');
    try { createPublicBooking($db, $input); throw new RuntimeException('Aceitou sobreposição'); }
    catch (DomainException $expected) { echo "OK: reserva sobreposta rejeitada\n"; }
    $other = $input;
    $other['slug'] = $slugs[1];
    try { createPublicBooking($db, $other); throw new RuntimeException('Aceitou quarto de outra pousada'); }
    catch (InvalidArgumentException $expected) { echo "OK: quarto de outra pousada rejeitado\n"; }
    $other['quarto_id'] = $rooms[1];
    $other['aceito_privacidade'] = false;
    try { createPublicBooking($db, $other); throw new RuntimeException('Aceitou sem privacidade'); }
    catch (InvalidArgumentException $expected) { echo "OK: consentimento obrigatório\n"; }
    $other['aceito_privacidade'] = true;
    assertTest(createPublicBooking($db, $other)['valor_total'] === 250.0, 'mesmas datas noutra pousada permitidas');
    insertTest($db, 'INSERT INTO bloqueios (id, pousada_id, quarto_id, data_inicio, data_fim, motivo) VALUES (UNHEX(?), UNHEX(?), UNHEX(?), ?, ?, ?)',
        [$blockId, $tenants[0], $rooms[0], $end, $next, 'ensaio']);
    $later = $input;
    $later['check_in'] = $end; $later['check_out'] = $next;
    try { createPublicBooking($db, $later); throw new RuntimeException('Aceitou bloqueio'); }
    catch (DomainException $expected) { echo "OK: bloqueio respeitado\n"; }
    $db->prepare('UPDATE bloqueios SET removido_em = NOW() WHERE id = UNHEX(?)')->execute([$blockId]);
    $later['aceito_privacidade'] = false;
    $manualResult = createPublicBooking($db, $later, true);
    assertTest($manualResult['valor_total'] === 125.0, 'reserva manual após remover bloqueio');
    $consent->execute([$manualResult['codigo_reserva']]);
    assertTest($consent->fetchColumn() === null, 'reserva manual não declara consentimento público');
    echo "Fim dos ensaios funcionais sequenciais. Concorrência entre processos ainda por testar.\n";
} finally {
    foreach ($tenants as $tenant) {
        foreach (['reservas', 'bloqueios', 'quartos'] as $table) {
            $db->prepare("DELETE FROM $table WHERE pousada_id = UNHEX(?)")->execute([$tenant]);
        }
        $db->prepare('DELETE FROM pousadas WHERE id = UNHEX(?)')->execute([$tenant]);
    }
    foreach ($owners as $owner) $db->prepare('DELETE FROM accounts WHERE id = UNHEX(?)')->execute([$owner]);
}
