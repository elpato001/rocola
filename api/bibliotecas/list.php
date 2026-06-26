<?php
// api/bibliotecas/list.php
header('Content-Type: application/json');
require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM bibliotecas ORDER BY fecha_creacion DESC");
        $bibliotecas = $stmt->fetchAll();
        
        // Contar elementos por biblioteca
        foreach ($bibliotecas as &$biblio) {
            $stmt_count = $pdo->prepare("SELECT COUNT(id) FROM multimedia WHERE biblioteca_id = ?");
            $stmt_count->execute([$biblio['id']]);
            $biblio['cantidad_archivos'] = $stmt_count->fetchColumn();
        }

        echo json_encode(['status' => 'success', 'data' => $bibliotecas]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
    }
}
?>
