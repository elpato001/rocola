<?php
// api/sync_artist.php
header('Content-Type: application/json');

if (!isset($_GET['name'])) {
    echo json_encode(['status' => 'error', 'message' => 'No artist provided']);
    exit;
}

$artist_raw = trim($_GET['name']);
$artist = urlencode($artist_raw);

$cache_dir = '../img/wallpapers';
if (!is_dir($cache_dir)) {
    mkdir($cache_dir, 0777, true);
}

$safe_filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($artist_raw));
$local_file = $cache_dir . '/' . $safe_filename . '.jpg';

if (file_exists($local_file)) {
    echo json_encode(['status' => 'success', 'message' => 'Already cached']);
    exit;
}

// Intentar usar TheAudioDB para conseguir Wallpapers (Fanarts) panorámicos reales
$url = "https://www.theaudiodb.com/api/v1/json/2/search.php?s={$artist}";
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
    
    if (isset($data['artists'][0])) {
        $art = $data['artists'][0];
        if (!empty($art['strArtistFanart'])) {
            $img_url = $art['strArtistFanart'];
        } elseif (!empty($art['strArtistFanart2'])) {
            $img_url = $art['strArtistFanart2'];
        } elseif (!empty($art['strArtistFanart3'])) {
            $img_url = $art['strArtistFanart3'];
        }
    }

    if ($img_url) {
        $image_data = @file_get_contents($img_url, false, $context);
        if ($image_data) {
            file_put_contents($local_file, $image_data);
            echo json_encode(['status' => 'success', 'message' => 'Wallpaper downloaded successfully']);
            exit;
        }
    }
}

echo json_encode(['status' => 'error', 'message' => 'Wallpaper not found on TheAudioDB']);
?>
