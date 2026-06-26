<?php
// api/get_media.php
header('Content-Type: application/json');
require_once 'db.php';

$media = [
    'music' => [],
    'karaoke' => [],
    'videos' => []
];

try {
    $sql = "
        SELECT 
            m.id, 
            m.titulo as name, 
            m.ruta_completa as url,
            m.extension as ext,
            m.portada,
            m.tipo,
            a.nombre as artista,
            al.nombre as album
        FROM multimedia m
        LEFT JOIN artistas a ON m.artista_id = a.id
        LEFT JOIN albumes al ON m.album_id = al.id
        WHERE m.activo = 1
        ORDER BY m.titulo ASC
    ";
    
    $stmt = $pdo->query($sql);
    $resultados = $stmt->fetchAll();

    foreach ($resultados as $row) {
        if (empty($row['portada'])) {
            $row['portada'] = 'https://ui-avatars.com/api/?name=' . urlencode($row['name']) . '&background=random&color=fff';
        }

        // Mapear tipo español a inglés para el frontend
        $tipo_map = ['musica' => 'music', 'karaoke' => 'karaoke', 'video' => 'videos'];
        $frontend_type = $tipo_map[$row['tipo']] ?? 'music';
        $row['type'] = $frontend_type;
        unset($row['tipo']);

        $row['filename'] = basename($row['url']);
        
        // Enviar la ruta completa base64 para stream.php
        $row['url'] = 'api/stream.php?file=' . base64_encode($row['url']);
        $row['is_external'] = true; // Todo pasa por stream.php ahora

        $media[$frontend_type][] = $row;
    }

    echo json_encode(['status' => 'success', 'data' => $media]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
