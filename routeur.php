<?php

declare(strict_types=1);

$cheminRequete = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$fichierLocal = __DIR__ . $cheminRequete;

if ($cheminRequete === '/api.php') {
    require __DIR__ . '/api.php';
    return true;
}

if ($cheminRequete !== '/' && is_file($fichierLocal)) {
    $extension = strtolower(pathinfo($fichierLocal, PATHINFO_EXTENSION));
    if ($extension === 'php') {
        http_response_code(403);
        echo 'Forbidden';
        return true;
    }

    $typesMime = [
        'css' => 'text/css; charset=utf-8',
        'js' => 'application/javascript; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'json' => 'application/json; charset=utf-8',
    ];

    if (isset($typesMime[$extension])) {
        header('Content-Type: ' . $typesMime[$extension]);
        header('Cache-Control: public, max-age=3600');
        readfile($fichierLocal);
        return true;
    }

    return false;
}

if ($cheminRequete === '/' || $cheminRequete === '/index.php') {
    require __DIR__ . '/index.php';
    return true;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Not Found';
return true;
