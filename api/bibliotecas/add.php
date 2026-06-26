<?php
// api/bibliotecas/add.php
header('Content-Type: application/json');
require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $nombre = $data['nombre'] ?? '';
    $tipo = $data['tipo'] ?? '';
    $ruta = $data['ruta'] ?? '';

    if (empty($nombre) || empty($tipo) || empty($ruta)) {
        echo json_encode(['status' => 'error', 'message' => 'Faltan datos obligatorios.']);
        exit;
    }

    if (!is_dir($ruta)) {
        echo json_encode(['status' => 'error', 'message' => 'La ruta no es un directorio válido o no existe.']);
        exit;
    }

    try {
        // Comprobar si la ruta ya existe
        $stmt = $pdo->prepare("SELECT id FROM bibliotecas WHERE ruta = ?");
        $stmt->execute([$ruta]);
        if ($stmt->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Esta biblioteca ya está registrada.']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO bibliotecas (nombre, tipo, ruta) VALUES (?, ?, ?)");
        $stmt->execute([$nombre, $tipo, $ruta]);

        echo json_encode(['status' => 'success', 'message' => 'Biblioteca agregada.', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
}
?>
