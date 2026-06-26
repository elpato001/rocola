<?php
// api/albumes.php
header('Content-Type: application/json');
require_once 'db.php';

$artista_id = $_GET['artista_id'] ?? null;
$tipo = $_GET['tipo'] ?? 'musica';
$tipos_validos = ['musica', 'karaoke', 'video'];
if (!in_array($tipo, $tipos_validos)) $tipo = 'musica';

$genero = $_GET['genero'] ?? '';

if (!$artista_id) {
    echo json_encode(['status' => 'error', 'message' => 'Falta artista_id']);
    exit;
}

try {
    $sql = "
        SELECT 
            al.id, 
            al.nombre, 
            (SELECT anio FROM multimedia WHERE album_id = al.id AND anio != '' LIMIT 1) as anio,
            (SELECT portada FROM multimedia WHERE album_id = al.id AND portada != '' LIMIT 1) as portada,
            COUNT(m.id) as cantidad_canciones
        FROM albumes al
        LEFT JOIN multimedia m ON m.album_id = al.id
        WHERE al.artista_id = ? AND m.tipo = ?
    ";
    
    $params = [$artista_id, $tipo];
    
    if (!empty($genero)) {
        $sql .= " AND m.genero = ?";
        $params[] = $genero;
    }
    
    $sql .= "
        GROUP BY al.id
        ORDER BY anio DESC, al.nombre ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $albumes = $stmt->fetchAll();

    // Check for tracks without an album
    $sql_null = "
        SELECT COUNT(id) as cantidad_canciones,
               (SELECT portada FROM multimedia WHERE artista_id = ? AND tipo = ? AND album_id IS NULL AND portada != '' LIMIT 1) as portada
        FROM multimedia 
        WHERE artista_id = ? AND tipo = ? AND album_id IS NULL AND activo = 1
    ";
    
    $params_null = [$artista_id, $tipo, $artista_id, $tipo];
    
    if (!empty($genero)) {
        $sql_null .= " AND genero = ?";
        $params_null[] = $genero;
    }
    
    $stmt_null = $pdo->prepare($sql_null);
    $stmt_null->execute($params_null);
    $null_data = $stmt_null->fetch();
    
    if ($null_data && $null_data['cantidad_canciones'] > 0) {
        $albumes[] = [
            'id' => 0,
            'nombre' => 'Pistas sin Álbum',
            'anio' => '',
            'portada' => $null_data['portada'],
            'cantidad_canciones' => $null_data['cantidad_canciones']
        ];
    }

    foreach ($albumes as &$album) {
        if (empty($album['portada'])) {
            $album['portada'] = 'https://ui-avatars.com/api/?name=' . urlencode($album['nombre']) . '&background=random&color=fff&size=250';
        }
    }

    echo json_encode(['status' => 'success', 'data' => $albumes]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
