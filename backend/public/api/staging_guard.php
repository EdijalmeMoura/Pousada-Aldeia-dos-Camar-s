<?php
declare(strict_types=1);

/** Falha fechada: este backend ainda só pode ligar-se a um domínio/base de ensaio. */
function requireStaging(array $config, array $server): void {
    $database = $config['database'] ?? null;
    $origin = $config['trusted_origin'] ?? null;
    $path = $config['cookie_path'] ?? null;
    if (($config['environment'] ?? null) !== 'staging'
        || !is_string($database) || !preg_match('/(?:^|_)test(?:_|$)/i', $database)
        || !is_string($origin) || !preg_match('#^https://[a-z0-9.-]+$#Di', $origin)
        || !is_string($path) || !preg_match('#^/(?:[a-z0-9-]+/)*(?:test|staging)/$#D', $path)) {
        throw new RuntimeException('Configuração de ensaio inválida.');
    }
    $host = strtolower((string)parse_url($origin, PHP_URL_HOST));
    if ($host === 'projetoredesnordeste.com.br' || str_ends_with($host, '.projetoredesnordeste.com.br')
        || $host === 'localhost' || filter_var($host, FILTER_VALIDATE_IP)) {
        throw new RuntimeException('Domínio de produção ou local não permitido para o ensaio.');
    }
    // Rejeita a publicação acidental em outro domínio ou numa subpasta diferente da compilada.
    if (strtolower((string)($server['HTTP_HOST'] ?? '')) !== $host
        || rtrim($path, '/') !== dirname(dirname((string)($server['SCRIPT_NAME'] ?? '')))
        || !in_array(strtolower((string)($server['HTTPS'] ?? '')), ['on', '1'], true)) {
        throw new RuntimeException('Instalação de ensaio fora do domínio/subpasta HTTPS previstos.');
    }
}
