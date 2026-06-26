<?php
// api/lyrics.php
header('Content-Type: application/json');

$artist = isset($_GET['artist']) ? trim($_GET['artist']) : '';
$title = isset($_GET['title']) ? trim($_GET['title']) : '';
$album = isset($_GET['album']) ? trim($_GET['album']) : 'Unknown_Album';

if (empty($artist) || empty($title)) {
    echo json_encode(['found' => false, 'error' => 'Missing artist or title']);
    exit;
}

// Clean title (remove stuff in parenthesis like "(Remix)", "[Audio Oficial]")
$clean_title = preg_replace('/[\[\(].*?[\]\)]/', '', $title);
$clean_title = trim($clean_title);

// Clean artist (sometimes it contains "feat.", we only want the main artist for search)
$clean_artist = explode(' feat', $artist)[0];
$clean_artist = explode(' ft', $clean_artist)[0];
$clean_artist = trim($clean_artist);

// Clean album
$clean_album = preg_replace('/[\[\(].*?[\]\)]/', '', $album);
$clean_album = trim($clean_album);
if(empty($clean_album)) $clean_album = 'Unknown_Album';

// Generate safe directory and filenames
$safe_artist = preg_replace('/[^a-zA-Z0-9]+/', '_', strtolower($clean_artist));
$safe_album = preg_replace('/[^a-zA-Z0-9]+/', '_', strtolower($clean_album));
$safe_title = preg_replace('/[^a-zA-Z0-9]+/', '_', strtolower($clean_title));

// Cache directory hierarchy: media/lyrics/Artist/Album/
$cache_dir = '../media/lyrics/' . $safe_artist . '/' . $safe_album;
if (!is_dir($cache_dir)) {
    mkdir($cache_dir, 0777, true);
}

$cache_file = $cache_dir . '/' . $safe_title . '.json';

$force = isset($_GET['force']) && $_GET['force'] == '1';

if (file_exists($cache_file)) {
    $cached_data = json_decode(file_get_contents($cache_file), true);
    // Return cached data if it was a successful find, OR if we are not forcing a retry of failed ones
    if (isset($cached_data['found']) && ($cached_data['found'] || !$force)) {
        echo json_encode($cached_data);
        exit;
    }
}

// Fetch from LRCLIB
$url = 'https://lrclib.net/api/get?artist_name=' . urlencode($clean_artist) . '&track_name=' . urlencode($clean_title);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Rocola Multimedia Player (https://github.com/)');
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code == 200 && $response) {
    $data = json_decode($response, true);
    if (isset($data['plainLyrics']) && !empty($data['plainLyrics'])) {
        $result = [
            'found' => true,
            'plainLyrics' => $data['plainLyrics'],
            'syncedLyrics' => $data['syncedLyrics'] ?? null,
            'source' => 'lrclib'
        ];
        
        // Save to cache
        file_put_contents($cache_file, json_encode($result));
        
        echo json_encode($result);
        exit;
    }
}

// Try searching if exact match fails
$search_url = 'https://lrclib.net/api/search?q=' . urlencode($clean_artist . ' ' . $clean_title);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $search_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Rocola Multimedia Player (https://github.com/)');
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$search_response = curl_exec($ch);
$search_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($search_http_code == 200 && $search_response) {
    $search_data = json_decode($search_response, true);
    if (!empty($search_data) && isset($search_data[0]['plainLyrics'])) {
        $result = [
            'found' => true,
            'plainLyrics' => $search_data[0]['plainLyrics'],
            'syncedLyrics' => $search_data[0]['syncedLyrics'] ?? null,
            'source' => 'lrclib_search'
        ];
        
        file_put_contents($cache_file, json_encode($result));
        echo json_encode($result);
        exit;
    }
}

// Si es error de servidor o rate limit, no cachear para poder reintentar luego
if ($http_code == 429 || $search_http_code == 429 || $http_code >= 500 || $search_http_code >= 500) {
    $empty_result = ['found' => false, 'error' => 'Rate limited or server error'];
    echo json_encode($empty_result);
    exit;
}

// Fallback: Empty cache to prevent re-fetching failed queries (404 Not Found)
$empty_result = ['found' => false, 'error' => 'Lyrics not found'];
file_put_contents($cache_file, json_encode($empty_result));
echo json_encode($empty_result);
