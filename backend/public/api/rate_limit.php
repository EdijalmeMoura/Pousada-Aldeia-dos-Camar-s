<?php
declare(strict_types=1);

class TooManyRequests extends DomainException {}

/** Janela de 15 minutos; usa REMOTE_ADDR, nunca cabeçalhos X-Forwarded-For enviados pelo cliente. */
function limitRequests(PDO $db, string $scope, int $max): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!is_string($ip) || $ip === '') throw new RuntimeException('Origem do pedido indisponível.');
    $key = hash('sha256', $scope . '|' . $ip);
    $query = $db->prepare('INSERT INTO auth_attempts (identifier, attempts, window_start) VALUES (UNHEX(?), 1, NOW()) ON DUPLICATE KEY UPDATE attempts = IF(window_start < NOW() - INTERVAL 15 MINUTE, 1, attempts + 1), window_start = IF(window_start < NOW() - INTERVAL 15 MINUTE, NOW(), window_start)');
    $query->execute([$key]);
    $query = $db->prepare('SELECT attempts FROM auth_attempts WHERE identifier = UNHEX(?)');
    $query->execute([$key]);
    if ((int)$query->fetchColumn() > $max) throw new TooManyRequests('Demasiados pedidos. Aguarde 15 minutos.');
}
