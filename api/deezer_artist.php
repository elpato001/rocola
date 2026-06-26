<?php
// api/deezer_artist.php
// Proxy para obtener la imagen oficial de un artista desde Deezer y guardarla localmente

if (!isset($_GET['name'])) {
    http_response_code(400);
    exit;
}

$artist_raw = trim($_GET['name']);
$artist = urlencode($artist_raw);

// Directorio para guardar las imágenes localmente
$cache_dir = '../img/artistas';
if (!is_dir($cache_dir)) {
    mkdir($cache_dir, 0777, true);
}

// Nombre de archivo seguro basado en el nombre del artista
$safe_filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($artist_raw));
$local_file = $cache_dir . '/' . $safe_filename . '.jpg';

// Si la imagen ya existe localmente, la servimos directamente
if (file_exists($local_file)) {
    header('Content-Type: image/jpeg');
    readfile($local_file);
    exit;
}

// Si no existe, buscamos en la API de Deezer
$url = "https://api.deezer.com/search/artist?q={$artist}&limit=1";

$options = [
    'http' => [
        'method' => "GET",
        'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n"
    ]
];
$context = stream_context_create($options);
$response = @file_get_contents($url, false, $context);

if ($response) {
    $data = json_decode($response, true);
    $img_url = null;
    
    // Buscar la mejor calidad
    if (isset($data['data'][0]['picture_xl'])) {
        $img_url = $data['data'][0]['picture_xl'];
    } elseif (isset($data['data'][0]['picture_big'])) {
        $img_url = $data['data'][0]['picture_big'];
    }

    if ($img_url) {
        // Descargar la imagen
        $image_data = @file_get_contents($img_url, false, $context);
        if ($image_data) {
            // Guardar localmente
            file_put_contents($local_file, $image_data);
            
            // Servir la imagen recién descargada
            header('Content-Type: image/jpeg');
            echo $image_data;
            exit;
        }
    }
}

// Si todo falla, redirigimos a un avatar local o UI-Avatars (que requiere internet)
$fallback = 'https://ui-avatars.com/api/?name=' . $artist . '&background=222&color=fff&size=500';
header("Location: $fallback");
exit;
?>
