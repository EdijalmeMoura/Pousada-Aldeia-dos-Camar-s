<?php
declare(strict_types=1);

/** Alinha a interpretação de datas PHP com CURRENT_DATE()/NOW() da ligação MySQL. */
function configureClock(PDO $db, array $config): void {
    $zoneName = $config['php_timezone'] ?? null;
    $offset = $config['mysql_time_offset'] ?? null;
    if (!is_string($zoneName) || !is_string($offset)
        || !in_array($offset, ['-02:00', '-03:00', '-04:00', '-05:00'], true)) {
        throw new RuntimeException('Fuso horário da pousada não configurado.');
    }
    try { $zone = new DateTimeZone($zoneName); }
    catch (Throwable $error) { throw new RuntimeException('Fuso horário PHP inválido.', 0, $error); }
    if ((new DateTimeImmutable('now', $zone))->format('P') !== $offset) {
        throw new RuntimeException('Fusos PHP e MySQL não coincidem no momento atual.');
    }
    if (!date_default_timezone_set($zoneName)) throw new RuntimeException('Não foi possível definir o fuso PHP.');
    $db->exec("SET time_zone = '$offset'"); // Offset validado pela lista fechada acima.
}
