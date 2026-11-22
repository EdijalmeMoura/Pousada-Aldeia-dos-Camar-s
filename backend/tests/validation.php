<?php
declare(strict_types=1);

/** Testes PHP CLI puros, sem MySQL. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../public/api/booking.php';
date_default_timezone_set('America/Recife');
$start = (new DateTimeImmutable('tomorrow'))->format('Y-m-d');
$end = (new DateTimeImmutable('tomorrow +2 days'))->format('Y-m-d');
$input = [
    'slug' => 'pousada-ensaio', 'quarto_id' => str_repeat('a', 32),
    'check_in' => $start, 'check_out' => $end,
    'nome_hospede' => 'Hóspede de Ensaio', 'email' => 'hospede@example.invalid',
    'telefone' => '81999999999', 'adultos' => 2, 'metodo_pagamento' => 'pix',
    'aceito_privacidade' => true,
];
function checkCase(bool $ok, string $name): void {
    if (!$ok) throw new RuntimeException('Falhou: ' . $name);
    echo 'OK: ' . $name . PHP_EOL;
}
function rejects(callable $operation, string $name): void {
    try { $operation(); }
    catch (InvalidArgumentException $expected) { echo 'OK: ' . $name . PHP_EOL; return; }
    throw new RuntimeException('Falhou: ' . $name);
}
checkCase(validateBooking($input)['slug'] === 'pousada-ensaio', 'reserva válida');
checkCase(validStay($start, $end) === 2, 'duas noites');
rejects(fn() => validateBooking([...$input, 'aceito_privacidade' => false]), 'consentimento obrigatório');
checkCase(validateBooking([...$input, 'aceito_privacidade' => false], true)['room'] === str_repeat('a', 32), 'reserva manual sem consentimento público inventado');
rejects(fn() => validateBooking([...$input, 'check_out' => $start]), 'entrada e saída iguais');
rejects(fn() => validateBooking([...$input, 'check_in' => '2026-02-30']), 'data impossível');
rejects(fn() => validateBooking([...$input, 'slug' => 'app/segredo']), 'slug inválido');
rejects(fn() => validateBooking([...$input, 'adultos' => 0]), 'sem hóspedes');
rejects(fn() => validateBooking([...$input, 'metodo_pagamento' => 'pago']), 'estado de pagamento não aceite');
rejects(fn() => validStay($start, (new DateTimeImmutable('tomorrow +91 days'))->format('Y-m-d')), 'mais de 90 noites');
echo "Validação PHP concluída sem acesso à base.\n";
