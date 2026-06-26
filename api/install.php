<?php
// api/install.php
header('Content-Type: application/json');

// Leer los datos JSON de la petición
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['status' => 'error', 'message' => 'Faltan datos de configuración.']);
    exit;
}

$host = $data['host'] ?? 'localhost';
$user = $data['user'] ?? 'root';
$pass = $data['pass'] ?? '';
$dbname = $data['dbname'] ?? 'rockola';

try {
    // 1. Probar la conexión sin base de datos
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 2. Crear Base de Datos
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname`");

    // 3. Crear Tablas Básicas
    
    // Tabla bibliotecas
    $pdo->exec("CREATE TABLE IF NOT EXISTS bibliotecas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255),
        tipo ENUM('musica','karaoke','video'),
        ruta TEXT,
        activa TINYINT DEFAULT 1,
        ultimo_escaneo DATETIME NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Tabla artistas
    $pdo->exec("CREATE TABLE IF NOT EXISTS artistas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) UNIQUE,
        imagen TEXT NULL
    )");

    // Tabla albumes
    $pdo->exec("CREATE TABLE IF NOT EXISTS albumes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        artista_id INT,
        nombre VARCHAR(255),
        portada TEXT,
        FOREIGN KEY (artista_id) REFERENCES artistas(id) ON DELETE CASCADE
    )");

    // Tabla multimedia
    $pdo->exec("CREATE TABLE IF NOT EXISTS multimedia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        biblioteca_id INT,
        artista_id INT NULL,
        album_id INT NULL,
        tipo ENUM('musica','karaoke','video'),
        titulo VARCHAR(255),
        ruta_completa TEXT,
        extension VARCHAR(20),
        duracion INT DEFAULT 0,
        genero VARCHAR(100),
        anio VARCHAR(10),
        portada TEXT,
        hash_archivo VARCHAR(64) UNIQUE,
        tamano BIGINT,
        fecha_modificacion DATETIME,
        fecha_indexacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        reproducciones INT DEFAULT 0,
        activo TINYINT DEFAULT 1,
        FOREIGN KEY (biblioteca_id) REFERENCES bibliotecas(id) ON DELETE CASCADE,
        FOREIGN KEY (artista_id) REFERENCES artistas(id) ON DELETE SET NULL,
        FOREIGN KEY (album_id) REFERENCES albumes(id) ON DELETE SET NULL
    )");

    // 4. Crear índices para rendimiento
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_titulo ON multimedia(titulo)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_tipo ON multimedia(tipo)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_activo ON multimedia(activo)");

    // 5. Guardar la configuración en config.json
    $configData = [
        'db_host' => $host,
        'db_user' => $user,
        'db_pass' => $pass,
        'db_name' => $dbname,
        'installed_at' => date('Y-m-d H:i:s')
    ];
    
    file_put_contents(__DIR__ . '/config.json', json_encode($configData, JSON_PRETTY_PRINT));

    echo json_encode(['status' => 'success', 'message' => 'Instalación completada correctamente.']);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de Base de Datos: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error General: ' . $e->getMessage()]);
}
?>
