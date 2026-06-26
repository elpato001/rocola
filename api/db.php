<?php
// api/db.php

$configFile = __DIR__ . '/config.json';

if (!file_exists($configFile)) {
    // If not in API context, we should probably redirect, but db.php is mostly used by APIs.
    // For safety, we output a JSON error. index.php will handle the setup redirect.
    echo json_encode(['status' => 'error', 'message' => 'Sistema no instalado. Falta config.json.']);
    exit;
}

$config = json_decode(file_get_contents($configFile), true);

$host = $config['db_host'] ?? 'localhost';
$user = $config['db_user'] ?? 'root';
$pass = $config['db_pass'] ?? '';
$dbname = $config['db_name'] ?? 'rockola';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die(json_encode(['status' => 'error', 'message' => 'Error de conexión a BD: ' . $e->getMessage()]));
}
?>
