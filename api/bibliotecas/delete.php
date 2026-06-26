<?php
// api/bibliotecas/delete.php
header('Content-Type: application/json');
require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;

    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'ID no proporcionado.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM bibliotecas WHERE id = ?");
        $stmt->execute([$id]);
        
        // Note: The ON DELETE CASCADE constraint in multimedia table will automatically
        // delete all associated media files from the database.

        echo json_encode(['status' => 'success', 'message' => 'Biblioteca eliminada.']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
}
?>
