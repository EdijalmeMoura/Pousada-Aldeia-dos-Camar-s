<?php
declare(strict_types=1);
require_once __DIR__ . '/rate_limit.php';

function startAuthSession(string $cookiePath): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') {
        throw new RuntimeException('HTTPS obrigatório para sessões.');
    }
    session_name('hospedae_session');
    session_set_cookie_params([
        'lifetime' => 0, 'path' => $cookiePath, 'secure' => true,
        'httponly' => true, 'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();
}

function requireSameOrigin(string $trustedOrigin): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!hash_equals($trustedOrigin, $origin)) {
        throw new InvalidArgumentException('Origem do pedido não autorizada.');
    }
}

function authBody(): array {
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json'
        || (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4096) {
        throw new InvalidArgumentException('Pedido inválido.');
    }
    $body = json_decode(file_get_contents('php://input'), true, 16, JSON_THROW_ON_ERROR);
    if (!is_array($body)) throw new InvalidArgumentException('Pedido inválido.');
    return $body;
}

function requireCsrf(array $body): void {
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($sent) || !is_string($_SESSION['csrf'] ?? null)
        || !hash_equals($_SESSION['csrf'], $sent)) {
        throw new InvalidArgumentException('Sessão inválida. Atualize a página.');
    }
}

function throttle(PDO $db, string $email): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $key = hash('sha256', $ip . '|' . $email);
    $query = $db->prepare('INSERT INTO auth_attempts (identifier, attempts, window_start) VALUES (UNHEX(?), 1, NOW()) ON DUPLICATE KEY UPDATE attempts = IF(window_start < NOW() - INTERVAL 15 MINUTE, 1, attempts + 1), window_start = IF(window_start < NOW() - INTERVAL 15 MINUTE, NOW(), window_start)');
    $query->execute([$key]);
    $query = $db->prepare('SELECT attempts FROM auth_attempts WHERE identifier = UNHEX(?)');
    $query->execute([$key]);
    if ((int)$query->fetchColumn() > 8) throw new TooManyRequests('Demasiadas tentativas. Aguarde 15 minutos.');
}

function currentAccount(PDO $db): ?array {
    if (empty($_SESSION['account_id']) || !preg_match('/^[0-9a-f]{32}$/D', $_SESSION['account_id'])) return null;
    $query = $db->prepare('SELECT HEX(a.id) AS id, a.email, HEX(p.id) AS pousada_id, p.nome AS nome_pousada, p.slug FROM accounts a JOIN pousadas p ON p.owner_id = a.id WHERE a.id = UNHEX(?)');
    $query->execute([$_SESSION['account_id']]);
    return $query->fetch(PDO::FETCH_ASSOC) ?: null;
}

function authAction(PDO $db, string $action, array $config): array {
    $cookiePath = $config['cookie_path'] ?? '/edijalmemoura/hospedae/';
    $origin = $config['trusted_origin'] ?? '';
    if (!is_string($cookiePath) || !str_starts_with($cookiePath, '/') || !str_ends_with($cookiePath, '/')
        || !is_string($origin) || !preg_match('#^https://[^/]+$#D', $origin)) {
        throw new RuntimeException('Configuração de sessão em falta.');
    }
    startAuthSession($cookiePath);
    if ($action === 'session') {
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
        return ['account' => currentAccount($db), 'csrf' => $_SESSION['csrf']];
    }
    requireSameOrigin($origin);
    $body = authBody();
    requireCsrf($body);
    if ($action === 'logout') {
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        return ['ok' => true, 'csrf' => $_SESSION['csrf']];
    }
    $email = mb_strtolower(trim((string)($body['email'] ?? '')));
    $password = $body['password'] ?? null;
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254
        || !is_string($password) || strlen($password) < 12 || strlen($password) > 256) {
        throw new InvalidArgumentException('Dados de acesso inválidos.');
    }
    limitRequests($db, 'auth-ip', 25);
    throttle($db, $email);
    if ($action === 'register') {
        $name = trim((string)($body['nome_pousada'] ?? ''));
        if (mb_strlen($name) < 2 || mb_strlen($name) > 160) throw new InvalidArgumentException('Nome da pousada inválido.');
        $id = bin2hex(random_bytes(16));
        $pousadaId = bin2hex(random_bytes(16));
        // Slug aleatório para impedir colisões e links internos reservados.
        $slug = 'pousada-' . bin2hex(random_bytes(8));
        $db->beginTransaction();
        try {
            $insert = $db->prepare('INSERT INTO accounts (id, email, password_hash) VALUES (UNHEX(?), ?, ?)');
            $insert->execute([$id, $email, password_hash($password, PASSWORD_DEFAULT)]);
            $insert = $db->prepare('INSERT INTO pousadas (id, owner_id, nome, slug) VALUES (UNHEX(?), UNHEX(?), ?, ?)');
            $insert->execute([$pousadaId, $id, $name, $slug]);
            $db->commit();
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            if ($error instanceof PDOException && $error->getCode() === '23000') {
                throw new DomainException('Não foi possível criar a conta com este e-mail.');
            }
            throw $error;
        }
    } else {
        $find = $db->prepare('SELECT HEX(id) AS id, password_hash FROM accounts WHERE email = ?');
        $find->execute([$email]);
        $row = $find->fetch(PDO::FETCH_ASSOC);
        if (!$row || !password_verify($password, $row['password_hash'])) {
            throw new InvalidArgumentException('E-mail ou palavra-passe incorretos.');
        }
        if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
            $db->prepare('UPDATE accounts SET password_hash = ? WHERE id = UNHEX(?)')
                ->execute([password_hash($password, PASSWORD_DEFAULT), $row['id']]);
        }
        $id = strtolower($row['id']);
    }
    session_regenerate_id(true);
    $_SESSION['account_id'] = $id;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return ['account' => currentAccount($db), 'csrf' => $_SESSION['csrf']];
}
