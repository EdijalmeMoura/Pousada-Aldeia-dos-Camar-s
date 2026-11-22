<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Sem rota genérica de escrita. Publicação só depois de testar em MySQL real.
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($action, ['health', 'pousada', 'quartos', 'reservar', 'session', 'register', 'login', 'logout', 'my-rooms', 'my-bookings', 'add-room', 'add-booking', 'my-blocks', 'add-block', 'quote', 'cancel-booking', 'remove-block'], true)
    || (in_array($action, ['reservar', 'register', 'login', 'logout', 'add-room', 'add-booking', 'add-block', 'cancel-booking', 'remove-block'], true) ? $method !== 'POST' : $method !== 'GET')) {
    http_response_code(404);
    echo json_encode(['error' => 'Rota não disponível']);
    exit;
}

// Ficheiro de configuração permanece fora da raiz pública; falha fechada.
$configPath = getenv('HOSPEDAE_CONFIG_PATH');
if (!$configPath || !is_file($configPath) || !realpath($configPath)
    || str_starts_with(realpath($configPath), realpath($_SERVER['DOCUMENT_ROOT'] ?? __DIR__) . DIRECTORY_SEPARATOR)) {
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
    if (in_array($action, ['session', 'register', 'login', 'logout'], true)) {
        require __DIR__ . '/auth.php';
        echo json_encode(authAction($pdo, $action, $config), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }
    if (in_array($action, ['my-rooms', 'my-bookings', 'add-room', 'add-booking', 'my-blocks', 'add-block', 'cancel-booking', 'remove-block'], true)) {
        require __DIR__ . '/operations.php';
        echo json_encode(operation($pdo, $action, $config), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }
    require __DIR__ . '/booking.php';
    require_once __DIR__ . '/rate_limit.php';
    $slug = (string)($_GET['slug'] ?? '');
    if (!in_array($action, ['reservar', 'quote'], true) && (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) || strlen($slug) > 80)) {
        throw new InvalidArgumentException('Endereço inválido.');
    }
    if ($action === 'pousada') $result = publicPousada($pdo, $slug);
    elseif ($action === 'quartos') $result = publicRooms($pdo, $slug);
    elseif ($action === 'quote') {
        limitRequests($pdo, 'quote', 60);
        require_once __DIR__ . '/availability.php';
        $result = quotePublic($pdo, (string)($_GET['slug'] ?? ''), (string)($_GET['quarto_id'] ?? ''), (string)($_GET['check_in'] ?? ''), (string)($_GET['check_out'] ?? ''), (int)($_GET['adultos'] ?? 0));
    } else {
        require_once __DIR__ . '/auth.php';
        requireSameOrigin((string)($config['trusted_origin'] ?? ''));
        limitRequests($pdo, 'public-booking', 6);
        if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json'
            || (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4096) throw new InvalidArgumentException('Pedido inválido.');
        $input = json_decode(file_get_contents('php://input'), true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($input)) throw new InvalidArgumentException('Pedido inválido.');
        $result = createPublicBooking($pdo, $input);
    }
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (TooManyRequests $error) {
    header('Retry-After: 900');
    http_response_code(429);
    echo json_encode(['error' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (RuntimeException $error) {
    http_response_code($error->getCode() === 401 ? 401 : 503);
    echo json_encode(['error' => $error->getCode() === 401 ? 'Autenticação necessária.' : 'Serviço indisponível.']);
} catch (InvalidArgumentException | DomainException | JsonException $error) {
    http_response_code($error instanceof DomainException ? 409 : 400);
    echo json_encode(['error' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('Hospedaê: falha na ligação à base de dados');
    http_response_code(503);
    echo json_encode(['status' => 'unavailable']);
}
