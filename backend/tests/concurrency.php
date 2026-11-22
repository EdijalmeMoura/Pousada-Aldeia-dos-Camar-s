<?php
declare(strict_types=1);

/** Ensaio CLI isolado; a base deve ser descartável e já migrada. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (getenv('RUN_PHP_INTEGRATION') !== 'I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE') exit(2);
$path = getenv('HOSPEDAE_TEST_CONFIG_PATH');
if (!$path || !is_file($path) || !str_ends_with($path, '.php')) exit(2);
$config = require $path;
if (!is_array($config) || ($config['environment'] ?? '') !== 'staging'
    || !preg_match('/(?:^|_)test(?:_|$)/i', (string)($config['database'] ?? ''))) exit(2);
require __DIR__ . '/../public/api/booking.php';
require __DIR__ . '/../public/api/clock.php';
function connectTest(array $config): PDO {
    $db = new PDO('mysql:host=' . $config['host'] . ';dbname=' . $config['database'] . ';charset=utf8mb4',
        $config['user'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    configureClock($db, $config);
    return $db;
}
$db = connectTest($config);
$owner = bin2hex(random_bytes(16));
$tenant = bin2hex(random_bytes(16));
$room = bin2hex(random_bytes(16));
$slug = 'test-' . bin2hex(random_bytes(6));
$start = (new DateTimeImmutable('tomorrow'))->format('Y-m-d');
$end = (new DateTimeImmutable('tomorrow +2 days'))->format('Y-m-d');
$input = ['slug' => $slug, 'quarto_id' => $room, 'nome_hospede' => 'Hóspede Ensaio',
    'email' => 'hospede@example.invalid', 'telefone' => '81999999999', 'check_in' => $start,
    'check_out' => $end, 'adultos' => 2, 'metodo_pagamento' => 'pix', 'aceito_privacidade' => true];
if (($argv[1] ?? '') === 'worker') {
    $input = json_decode((string)getenv('HOSPEDAE_CONCURRENCY_INPUT'), true, 512, JSON_THROW_ON_ERROR);
    echo "PRONTO\n";
    flush();
    try {
        createPublicBooking($db, $input, ($argv[2] ?? '') === 'manual');
        echo "CRIADA\n";
    } catch (DomainException $error) {
        echo "CONFLITO\n";
    }
    exit;
}
if ((int)$db->query('SELECT COUNT(*) FROM accounts')->fetchColumn() !== 0) {
    fwrite(STDERR, "A base de ensaio não está vazia.\n"); exit(2);
}
$workers = [];
try {
    $db->prepare('INSERT INTO accounts (id, email, password_hash) VALUES (UNHEX(?), ?, ?)')
        ->execute([$owner, $slug . '@example.invalid', password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT)]);
    $db->prepare('INSERT INTO pousadas (id, owner_id, nome, slug) VALUES (UNHEX(?), UNHEX(?), ?, ?)')
        ->execute([$tenant, $owner, 'Pousada de ensaio', $slug]);
    $db->prepare('INSERT INTO quartos (id, pousada_id, nome, capacidade, preco_base_centavos) VALUES (UNHEX(?), UNHEX(?), ?, ?, ?)')
        ->execute([$room, $tenant, 'Quarto de ensaio', 2, 12500]);
    // O bloqueio inicial força os dois processos a esperar pela mesma linha.
    $db->beginTransaction();
    $lock = $db->prepare('SELECT id FROM quartos WHERE id = UNHEX(?) FOR UPDATE');
    $lock->execute([$room]);
    foreach (['public', 'manual'] as $kind) {
        $command = [PHP_BINARY, __FILE__, 'worker', $kind];
        $pipes = [];
        $process = proc_open($command, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes,
            null, array_merge($_ENV, [
                'RUN_PHP_INTEGRATION' => 'I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE',
                'HOSPEDAE_TEST_CONFIG_PATH' => $path,
                'HOSPEDAE_CONCURRENCY_INPUT' => json_encode($input, JSON_THROW_ON_ERROR),
            ]));
        if (!is_resource($process)) throw new RuntimeException('Não foi possível iniciar o processo.');
        fclose($pipes[0]);
        $workers[] = [$process, $pipes];
    }
    // Ambos os trabalhadores anunciaram que vão tentar o mesmo quarto.
    foreach ($workers as [, $pipes]) {
        stream_set_timeout($pipes[1], 10);
        if (trim((string)fgets($pipes[1])) !== 'PRONTO') {
            throw new RuntimeException('Um dos processos não chegou à reserva.');
        }
    }
    // A linha permanece bloqueada até ambos terem arrancado.
    usleep(200000);
    $db->commit();
    $outputs = [];
    foreach ($workers as [$process, $pipes]) {
        $output = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        if (proc_close($process) !== 0) throw new RuntimeException('Processo de reserva falhou: ' . $error);
        $outputs[] = trim($output);
    }
    $workers = [];
    sort($outputs);
    $count = $db->prepare('SELECT COUNT(*) FROM reservas WHERE quarto_id = UNHEX(?)');
    $count->execute([$room]);
    if ($outputs !== ['CONFLITO', 'CRIADA'] || (int)$count->fetchColumn() !== 1) {
        throw new RuntimeException('Duas reservas para o mesmo quarto ou resultado inesperado: ' . implode(', ', $outputs));
    }
    echo "OK: reserva pública e manual concorrentes; uma criada, outra recusada.\n";
} finally {
    if ($db->inTransaction()) $db->rollBack();
    foreach ($workers as [$process, $pipes]) {
        proc_terminate($process);
        foreach ($pipes as $pipe) if (is_resource($pipe)) fclose($pipe);
        proc_close($process);
    }
    $db->prepare('DELETE FROM reservas WHERE pousada_id = UNHEX(?)')->execute([$tenant]);
    $db->prepare('DELETE FROM quartos WHERE pousada_id = UNHEX(?)')->execute([$tenant]);
    $db->prepare('DELETE FROM pousadas WHERE id = UNHEX(?)')->execute([$tenant]);
    $db->prepare('DELETE FROM accounts WHERE id = UNHEX(?)')->execute([$owner]);
}
