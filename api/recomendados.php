<?php
// api/recomendados.php
header('Content-Type: application/json');
require_once 'db.php';

try {
    // Check if the multimedia table exists first to avoid errors if the db is fresh
    $stmt = $pdo->query("SHOW TABLES LIKE 'multimedia'");
    if ($stmt->rowCount() == 0) {
        echo json_encode(['status' => 'success', 'data' => []]);
        exit;
    }

    $sql = "
        SELECT 
            m.id, 
            m.titulo as name, 
            m.ruta_completa as url,
            m.duracion,
            m.portada,
            m.tipo,
            m.artista_id,
            m.album_id,
            a.nombre as artista,
            al.nombre as album
        FROM multimedia m
        LEFT JOIN artistas a ON m.artista_id = a.id
        LEFT JOIN albumes al ON m.album_id = al.id
        ORDER BY RAND()
        LIMIT 15
    ";
    
    $stmt = $pdo->query($sql);
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
        if (empty($item['portada'])) {
            $item['portada'] = 'https://ui-avatars.com/api/?name=' . urlencode($item['name']) . '&background=random&color=fff';
        }
        
        // Mapear tipo español a inglés para el frontend
        $tipo_map = ['musica' => 'music', 'karaoke' => 'karaoke', 'video' => 'videos'];
        $item['type'] = $tipo_map[$item['tipo']] ?? $item['tipo'];
        unset($item['tipo']);
        
        // Enviar la ruta completa base64 para stream.php
        $item['url'] = 'api/stream.php?file=' . base64_encode($item['url']);
    }

    echo json_encode(['status' => 'success', 'data' => $items]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
