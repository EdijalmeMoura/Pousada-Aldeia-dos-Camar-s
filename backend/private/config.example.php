<?php
// Copie para config.php FORA de public_html. Nunca guarde palavras-passe no Git.
return [
    'host' => 'localhost',
    'database' => 'conta_test_hospedae',
    'user' => 'utilizador_da_base',
    'password' => 'substituir_no_servidor',
    'environment' => 'staging', // Este código PHP ainda não pode operar em produção.
    'trusted_origin' => 'https://staging.exemplo.org',
    'cookie_path' => '/test/',
    'php_timezone' => 'America/Recife',
    'mysql_time_offset' => '-03:00',
];
