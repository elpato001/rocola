<?php
// api/top.php
require_once 'db.php';

header('Content-Type: application/json');

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;

try {
    $stmt = $pdo->prepare("
        SELECT m.id, m.titulo as name, m.ruta_completa as url, m.portada, 
               a.nombre as artista, IF(m.tipo='musica','music',m.tipo) as type, m.reproducciones 
        FROM multimedia m
        LEFT JOIN artistas a ON m.artista_id = a.id
        WHERE m.tipo = 'musica' AND m.activo = 1 AND m.reproducciones > 0
        ORDER BY m.reproducciones DESC
        LIMIT ?
    ");
    
    // En PDO, bindValue es necesario para LIMIT si emulation mode está on
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    $results = $stmt->fetchAll();
    
    foreach ($results as &$item) {
        $item['url'] = 'api/stream.php?file=' . base64_encode($item['url']);
        if (empty($item['portada'])) {
            $item['portada'] = 'https://ui-avatars.com/api/?name=' . urlencode($item['name']) . '&background=random&color=fff';
        }
    }
    
    echo json_encode(['status' => 'success', 'data' => $results]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error al obtener top: ' . $e->getMessage()]);
}
?>
