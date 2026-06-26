<?php
// api/canciones_genero.php
header('Content-Type: application/json');
require_once 'db.php';

$genero = $_GET['genero'] ?? '';

if (empty($genero)) {
    echo json_encode(['status' => 'error', 'message' => 'Género no especificado']);
    exit;
}

try {
    $sql = "
        SELECT 
            m.id, 
            m.titulo as name, 
            m.ruta_completa as url,
            m.duracion,
            m.portada,
            IF(m.tipo='musica','music',m.tipo) as type,
            m.artista_id,
            m.album_id,
            a.nombre as artista,
            al.nombre as album,
            m.genero
        FROM multimedia m
        LEFT JOIN artistas a ON m.artista_id = a.id
        LEFT JOIN albumes al ON m.album_id = al.id
        WHERE m.genero = ? AND m.tipo = 'musica' AND m.activo = 1
        ORDER BY a.nombre ASC, al.nombre ASC, m.titulo ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$genero]);
    $canciones = $stmt->fetchAll();
    
    foreach ($canciones as &$item) {
        if (empty($item['portada'])) {
            $item['portada'] = 'https://ui-avatars.com/api/?name=' . urlencode($item['name']) . '&background=random&color=fff';
        }
        
        // Enviar la ruta completa base64 para stream.php
        $item['url'] = 'api/stream.php?file=' . base64_encode($item['url']);
    }

    echo json_encode(['status' => 'success', 'data' => $canciones]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
