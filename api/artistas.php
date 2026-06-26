<?php
// api/artistas.php
header('Content-Type: application/json');
require_once 'db.php';

try {
    $tipo = $_GET['tipo'] ?? 'musica';
    $tipos_validos = ['musica', 'karaoke', 'video'];
    if (!in_array($tipo, $tipos_validos)) $tipo = 'musica';
    
    $genero = $_GET['genero'] ?? '';
    
    // Obtenemos los artistas junto con el conteo de álbumes y canciones
    // y seleccionamos una portada aleatoria (o la primera) de la tabla multimedia
    $sql = "
        SELECT 
            a.id, 
            a.nombre,
            COUNT(DISTINCT al.id) as cantidad_albumes,
            COUNT(DISTINCT m.id) as cantidad_canciones,
            (SELECT portada FROM multimedia WHERE artista_id = a.id AND portada IS NOT NULL AND portada != '' LIMIT 1) as imagen
        FROM artistas a
        LEFT JOIN albumes al ON al.artista_id = a.id
        LEFT JOIN multimedia m ON m.artista_id = a.id
        WHERE m.tipo = ?
    ";
    
    $params = [$tipo];
    
    if (!empty($genero)) {
        $sql .= " AND m.genero = ?";
        $params[] = $genero;
    }
    
    $sql .= "
        GROUP BY a.id
        ORDER BY a.nombre ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $artistas = $stmt->fetchAll();
    
    // Fallback imagen si no hay portada: Usar proxy de Deezer
    foreach ($artistas as &$artista) {
        if (empty($artista['imagen'])) {
            $artista['imagen'] = 'api/deezer_artist.php?name=' . urlencode($artista['nombre']);
        }
    }

    echo json_encode(['status' => 'success', 'data' => $artistas]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
