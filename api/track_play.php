<?php
// api/track_play.php
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_GET['id'])) {
    echo json_encode(['status' => 'error', 'message' => 'ID no proporcionado']);
    exit;
}

$id = intval($_GET['id']);

try {
    $stmt = $pdo->prepare("UPDATE multimedia SET reproducciones = reproducciones + 1 WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['status' => 'success', 'message' => 'Reproducción registrada']);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error al registrar: ' . $e->getMessage()]);
}
?>
