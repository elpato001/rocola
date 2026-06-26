<?php
// api/bibliotecas/picker.php
header('Content-Type: application/json');

// Modo 1: Explorador web de directorios (GET ?path=X)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['path'])) {
    $path = $_GET['path'];
    
    // Seguridad básica: solo listar unidades de disco y sus carpetas
    if (!is_dir($path)) {
        echo json_encode(['status' => 'error', 'message' => 'Ruta no válida.']);
        exit;
    }
    
    $items = [];
    $entries = @scandir($path);
    if ($entries === false) {
        echo json_encode(['status' => 'error', 'message' => 'No se puede leer la ruta.']);
        exit;
    }
    
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') continue;
        $full = rtrim($path, '\\/') . DIRECTORY_SEPARATOR . $entry;
        if (is_dir($full)) {
            $items[] = [
                'name' => $entry,
                'path' => $full
            ];
        }
    }
    
    // Ordenar alfabéticamente
    usort($items, function($a, $b) { return strcasecmp($a['name'], $b['name']); });
    
    echo json_encode(['status' => 'success', 'items' => $items, 'current' => $path]);
    exit;
}

// Modo 2: Listar unidades de disco disponibles (GET sin parámetros)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['path'])) {
    $drives = [];
    
    // Windows: listar letras de unidades
    if (PHP_OS_FAMILY === 'Windows') {
        foreach (range('A', 'Z') as $letter) {
            $drive = $letter . ':\\';
            if (is_dir($drive)) {
                $drives[] = [
                    'name' => $drive,
                    'path' => $drive
                ];
            }
        }
    } else {
        // Linux/Mac
        $drives[] = ['name' => '/', 'path' => '/'];
    }
    
    echo json_encode(['status' => 'success', 'items' => $drives, 'current' => '']);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Método no soportado.']);
?>
