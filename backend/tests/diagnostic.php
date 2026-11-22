<?php
declare(strict_types=1);

/** Diagnóstico local, somente leitura. Não colocar em public_html. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$errors = [];
function report(bool $ok, string $label): void {
    global $errors;
    echo ($ok ? 'OK: ' : 'FALHA: ') . $label . PHP_EOL;
    if (!$ok) $errors[] = $label;
}
report(PHP_VERSION_ID >= 80200, 'PHP 8.2 ou superior');
foreach (['pdo_mysql', 'mbstring'] as $extension) report(extension_loaded($extension), "Extensão $extension disponível");
$path = getenv('HOSPEDAE_TEST_CONFIG_PATH');
if (!$path || !is_file($path) || !str_ends_with($path, '.php')) {
    report(false, 'HOSPEDAE_TEST_CONFIG_PATH aponta para config.php privado de ensaio');
    exit(1);
}
$real = realpath($path);
report($real !== false && !str_contains(str_replace('\\', '/', $real), '/public_html/'), 'Configuração fora de public_html');
if ($errors) exit(1);
try {
    $config = require $path;
    if (!is_array($config) || !isset($config['host'], $config['database'], $config['user'], $config['password'])) {
        throw new RuntimeException('Configuração incompleta');
    }
    report((bool)preg_match('/(?:^|_)test(?:_|$)/i', (string)$config['database']), 'Base explicitamente identificada como teste');
    if ($errors) exit(1);
    // Nunca imprimir valores da configuração nem o erro bruto da ligação.
    $db = new PDO('mysql:host=' . $config['host'] . ';dbname=' . $config['database'] . ';charset=utf8mb4',
        $config['user'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
    report(true, 'Ligação PDO MySQL');
    require __DIR__ . '/../public/api/clock.php';
    configureClock($db, $config);
    report($db->query('SELECT @@session.time_zone')->fetchColumn() === $config['mysql_time_offset'], 'Fusos PHP e MySQL alinhados');
    $tables = ['accounts', 'pousadas', 'quartos', 'reservas', 'bloqueios', 'auth_attempts'];
    $query = $db->query('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
    $engines = $query->fetchAll(PDO::FETCH_KEY_PAIR);
    foreach ($tables as $table) report(($engines[$table] ?? '') === 'InnoDB', "Tabela $table em InnoDB");
    $required = [
        'accounts' => ['id', 'email', 'password_hash', 'session_version'],
        'pousadas' => ['id', 'owner_id', 'nome', 'slug', 'chave_pix', 'link_pagamento'],
        'quartos' => ['id', 'pousada_id', 'preco_base_centavos', 'ativo'],
        'reservas' => ['id', 'pousada_id', 'quarto_id', 'estado', 'check_in', 'check_out', 'valor_total_centavos', 'consentimento_em', 'confirmada_em', 'codigo_reserva', 'metodo_pagamento', 'cancelada_em', 'motivo_cancelamento'],
        'bloqueios' => ['id', 'pousada_id', 'quarto_id', 'data_inicio', 'data_fim', 'removido_em'],
        'auth_attempts' => ['identifier', 'attempts', 'window_start'],
    ];
    $query = $db->query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()');
    $found = [];
    foreach ($query as $row) $found[$row['TABLE_NAME']][] = $row['COLUMN_NAME'];
    foreach ($required as $table => $columns) {
        report(array_diff($columns, $found[$table] ?? []) === [], "Colunas obrigatórias de $table");
    }
    $checks = ['ck_reserva_datas', 'ck_reserva_adultos', 'ck_bloqueio_datas'];
    $query = $db->query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'CHECK'");
    $foundChecks = $query->fetchAll(PDO::FETCH_COLUMN);
    foreach ($checks as $check) report(in_array($check, $foundChecks, true), "Restrição CHECK $check");
    $fks = ['fk_pousada_owner', 'fk_quarto_pousada', 'fk_reserva_quarto_pousada', 'fk_bloqueio_quarto_pousada'];
    $query = $db->query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'");
    $foundFks = $query->fetchAll(PDO::FETCH_COLUMN);
    foreach ($fks as $fk) report(in_array($fk, $foundFks, true), "Chave estrangeira $fk");
    $query = $db->query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND NON_UNIQUE = 0');
    $uniqueColumns = [];
    foreach ($query as $row) $uniqueColumns[$row['TABLE_NAME']][] = $row['COLUMN_NAME'];
    foreach (['accounts' => 'email', 'pousadas' => 'slug', 'reservas' => 'codigo_reserva'] as $table => $column) {
        report(in_array($column, $uniqueColumns[$table] ?? [], true), "Unicidade de $table.$column");
    }
} catch (Throwable $error) {
    report(false, 'Não foi possível verificar a base de ensaio (erro ocultado; consulte os registos locais)');
}
echo $errors ? 'DIAGNÓSTICO INCOMPLETO' . PHP_EOL : 'DIAGNÓSTICO LOCAL OK — falta testar os fluxos e a concorrência.' . PHP_EOL;
exit($errors ? 1 : 0);
