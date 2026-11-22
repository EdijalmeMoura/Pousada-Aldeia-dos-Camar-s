<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Sem rota genérica de escrita. Publicação só depois de testar em MySQL real.
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($action, ['health', 'pousada', 'quartos', 'reservar'], true)
    || ($action === 'reservar' ? $method !== 'POST' : $method !== 'GET')) {
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
    if ($action === 'health') {
        $pdo->query('SELECT 1');
        echo json_encode(['status' => 'database_connected']);
        exit;
    }
    require __DIR__ . '/booking.php';
    $slug = (string)($_GET['slug'] ?? '');
    if ($action !== 'reservar' && (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) || strlen($slug) > 80)) {
        throw new InvalidArgumentException('Endereço inválido.');
    }
    if ($action === 'pousada') $result = publicPousada($pdo, $slug);
    elseif ($action === 'quartos') $result = publicRooms($pdo, $slug);
    else {
        if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json'
            || (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4096) throw new InvalidArgumentException('Pedido inválido.');
        $input = json_decode(file_get_contents('php://input'), true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($input)) throw new InvalidArgumentException('Pedido inválido.');
        $result = createPublicBooking($pdo, $input);
    }
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (InvalidArgumentException | DomainException | JsonException $error) {
    http_response_code($error instanceof DomainException ? 409 : 400);
    echo json_encode(['error' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('Hospedaê: falha na ligação à base de dados');
    http_response_code(503);
    echo json_encode(['status' => 'unavailable']);
}
