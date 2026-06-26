<?php
// api/canciones_all.php
header('Content-Type: application/json');
require_once 'db.php';

try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'multimedia'");
    if ($stmt->rowCount() == 0) {
        echo json_encode(['status' => 'success', 'data' => []]);
        exit;
    }

    $sql = "
        SELECT 
            m.id, 
            m.titulo as title, 
            a.nombre as artist,
            al.nombre as album
        FROM multimedia m
        LEFT JOIN artistas a ON m.artista_id = a.id
        LEFT JOIN albumes al ON m.album_id = al.id
        WHERE m.tipo = 'musica'
    ";
    
    $stmt = $pdo->query($sql);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'data' => $items]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
