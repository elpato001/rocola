<?php
header('Content-Type: application/json');
require_once 'db.php';

try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'artistas'");
    if ($stmt->rowCount() == 0) {
        echo json_encode(['status' => 'success', 'data' => []]);
        exit;
    }

    $tipo = $_GET['tipo'] ?? 'music';
    $tipoMapping = ['music' => 'musica', 'karaoke' => 'karaoke', 'videos' => 'video'];
    $tipo_real = $tipoMapping[$tipo] ?? 'musica';

    $sql = "
        SELECT 
            a.id, 
            a.nombre, 
            (SELECT portada FROM multimedia WHERE artista_id = a.id AND portada IS NOT NULL AND portada != '' LIMIT 1) as imagen,
            (SELECT COUNT(DISTINCT al.id) FROM albumes al JOIN multimedia m2 ON m2.album_id = al.id WHERE al.artista_id = a.id AND m2.tipo = ?) as cantidad_albumes,
            (SELECT COUNT(*) FROM multimedia m3 WHERE m3.artista_id = a.id AND m3.tipo = ?) as cantidad_canciones
        FROM artistas a
        INNER JOIN multimedia m ON m.artista_id = a.id
        WHERE m.tipo = ?
        GROUP BY a.id
        ORDER BY a.id DESC
        LIMIT 15
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$tipo_real, $tipo_real, $tipo_real]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($items as &$item) {
        if (empty($item['imagen'])) {
            $item['imagen'] = 'https://ui-avatars.com/api/?name=' . urlencode($item['nombre']) . '&background=random&color=fff';
        }
    }

    echo json_encode(['status' => 'success', 'data' => $items]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
