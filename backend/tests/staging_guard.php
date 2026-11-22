<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../public/api/staging_guard.php';
$config = [
    'environment' => 'staging', 'database' => 'conta_test_hospedae',
    'trusted_origin' => 'https://staging.exemplo.org', 'cookie_path' => '/test/',
];
$server = ['HTTP_HOST' => 'staging.exemplo.org', 'SCRIPT_NAME' => '/test/api/index.php', 'HTTPS' => 'on'];
requireStaging($config, $server);
$cases = [
    [[...$config, 'environment' => 'production'], $server],
    [[...$config, 'database' => 'conta_producao'], $server],
    [[...$config, 'trusted_origin' => 'https://projetoredesnordeste.com.br'], $server],
    [$config, [...$server, 'HTTP_HOST' => 'projetoredesnordeste.com.br']],
    [$config, [...$server, 'SCRIPT_NAME' => '/edijalmemoura/hospedae/api/index.php']],
    [$config, [...$server, 'HTTPS' => 'off']],
];
foreach ($cases as [$invalidConfig, $invalidServer]) {
    try { requireStaging($invalidConfig, $invalidServer); }
    catch (RuntimeException $expected) { continue; }
    fwrite(STDERR, "Falha: ensaio perigoso foi aceite.\n");
    exit(1);
}
echo "Guarda de ensaio aprovado (sem MySQL).\n";
