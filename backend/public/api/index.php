<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Endpoint sem dados privados. Não aceitar rotas de escrita até existir autenticação.
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || ($_SERVER['PATH_INFO'] ?? '') !== '/health') {
    http_response_code(404);
    echo json_encode(['error' => 'Rota não disponível']);
    exit;
}

// Ficheiro de configuração permanece fora da raiz pública; falha fechada.
$configPath = getenv('HOSPEDAE_CONFIG_PATH');
if (!$configPath || !is_file($configPath)) {
    http_response_code(503);
    echo json_encode(['status' => 'unconfigured']);
    exit;
}
try {
    $config = require $configPath;
    $pdo = new PDO(
        'mysql:host=' . $config['host'] . ';dbname=' . $config['database'] . ';charset=utf8mb4',
        $config['user'],
        $config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]
    );
    $pdo->query('SELECT 1');
    echo json_encode(['status' => 'database_connected']);
} catch (Throwable $error) {
    error_log('Hospedaê: falha na ligação à base de dados');
    http_response_code(503);
    echo json_encode(['status' => 'unavailable']);
}
