<?php
// api/bibliotecas/edit.php
header('Content-Type: application/json');
require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $id = $data['id'] ?? null;
    $nombre = $data['nombre'] ?? '';
    $tipo = $data['tipo'] ?? '';
    $ruta = $data['ruta'] ?? '';

    if (!$id || empty($nombre) || empty($tipo) || empty($ruta)) {
        echo json_encode(['status' => 'error', 'message' => 'Faltan datos obligatorios.']);
        exit;
    }

    if (!is_dir($ruta)) {
        echo json_encode(['status' => 'error', 'message' => 'La ruta no es un directorio válido o no existe.']);
        exit;
    }

    try {
        // Comprobar si la ruta ya existe en OTRA biblioteca
        $stmt = $pdo->prepare("SELECT id FROM bibliotecas WHERE ruta = ? AND id != ?");
        $stmt->execute([$ruta, $id]);
        if ($stmt->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Esta ruta ya está siendo usada por otra biblioteca.']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE bibliotecas SET nombre = ?, tipo = ?, ruta = ? WHERE id = ?");
        $stmt->execute([$nombre, $tipo, $ruta, $id]);

        echo json_encode(['status' => 'success', 'message' => 'Biblioteca actualizada.']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
}
?>
