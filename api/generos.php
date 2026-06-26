<?php
// api/generos.php
header('Content-Type: application/json');
require_once 'db.php';

try {
    // Only get genres for music that are not empty
    $sql = "
        SELECT 
            m.genero as nombre,
            COUNT(m.id) as cantidad_canciones,
            (SELECT portada FROM multimedia m2 WHERE m2.genero = m.genero AND m2.portada IS NOT NULL AND m2.portada != '' LIMIT 1) as imagen
        FROM multimedia m
        WHERE m.tipo = 'musica' AND m.genero IS NOT NULL AND m.genero != '' AND m.activo = 1
        GROUP BY m.genero
        ORDER BY m.genero ASC
    ";
    
    $stmt = $pdo->query($sql);
    $generos = $stmt->fetchAll();
    
    // Provide a fallback avatar if there's no cover image found for the genre
    foreach ($generos as &$genero) {
        if (empty($genero['imagen'])) {
            $genero['imagen'] = 'https://ui-avatars.com/api/?name=' . urlencode($genero['nombre']) . '&background=random&color=fff';
        }
    }

    echo json_encode(['status' => 'success', 'data' => $generos]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
}
?>
