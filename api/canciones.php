<?php
// api/canciones.php
header('Content-Type: application/json');
require_once 'db.php';

$album_id = $_GET['album_id'] ?? null;
$artista_id = $_GET['artista_id'] ?? null;

if ($album_id === null && $artista_id === null) {
    echo json_encode(['status' => 'error', 'message' => 'Falta album_id o artista_id']);
    exit;
}

try {
    // Intentar extraer el número de pista del título si comienza con números para poder ordenarlo mejor.
    // Esto lo hace MySQL automáticamente si hacemos CAST a entero, o podemos ordenar por título.
    $where = [];
    $params = [];
    
    $tipo = $_GET['tipo'] ?? 'musica';
    $tipos_validos = ['musica', 'karaoke', 'video'];
    if (!in_array($tipo, $tipos_validos)) $tipo = 'musica';

    $genero = $_GET['genero'] ?? '';

    if ($album_id !== null && $album_id !== '') {
        if ($album_id == 0) {
            $where[] = "m.album_id IS NULL";
        } else {
            $where[] = "m.album_id = ?";
            $params[] = $album_id;
        }
    }
    if ($artista_id) {
        $where[] = "m.artista_id = ?";
        $params[] = $artista_id;
    }
    
    $where[] = "m.tipo = ?";
    $params[] = $tipo;

    if (!empty($genero)) {
        $where[] = "m.genero = ?";
        $params[] = $genero;
    }
    
    $where_sql = implode(' AND ', $where);

    $sql = "
        SELECT 
            m.id, 
            m.titulo as name, 
            m.ruta_completa as url,
            m.duracion,
            m.portada,
            m.tipo,
            a.nombre as artista,
            (SELECT portada FROM multimedia m2 WHERE m2.artista_id = a.id AND m2.portada IS NOT NULL AND m2.portada != '' LIMIT 1) as artista_imagen,
            al.nombre as album
        FROM multimedia m
        LEFT JOIN artistas a ON m.artista_id = a.id
        LEFT JOIN albumes al ON m.album_id = al.id
        WHERE $where_sql
        ORDER BY CAST(m.titulo AS UNSIGNED) ASC, m.titulo ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $canciones = $stmt->fetchAll();

    foreach ($canciones as &$cancion) {
        if (empty($cancion['portada'])) {
            $cancion['portada'] = 'https://ui-avatars.com/api/?name=' . urlencode($cancion['name']) . '&background=random&color=fff';
        }
        if (empty($cancion['artista_imagen']) && !empty($cancion['artista'])) {
            $cancion['artista_imagen'] = 'https://ui-avatars.com/api/?name=' . urlencode($cancion['artista']) . '&background=random&color=fff';
        }
        
        // Mapear tipo español a inglés para el frontend
        $tipo_map = ['musica' => 'music', 'karaoke' => 'karaoke', 'video' => 'videos'];
        $cancion['type'] = $tipo_map[$cancion['tipo']] ?? $cancion['tipo'];
        unset($cancion['tipo']);
        
        // Enviar la ruta completa base64 para stream.php
        $cancion['url'] = 'api/stream.php?file=' . base64_encode($cancion['url']);
    }

    echo json_encode(['status' => 'success', 'data' => $canciones]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
