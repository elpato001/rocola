<?php
header('Content-Type: application/json');

$settings_file = '../data/settings.json';
$settings = [];
if (file_exists($settings_file)) {
    $settings = json_decode(file_get_contents($settings_file), true) ?: [];
}

$base_dir = '../media/';
$categories = ['music', 'karaoke', 'videos'];
$stats = [
    'music' => 0,
    'karaoke' => 0,
    'videos' => 0,
    'total' => 0
];

$allowed_extensions = [
    'music' => ['mp3', 'wav', 'ogg', 'm4a'],
    'karaoke' => ['mp4', 'mkv', 'webm', 'mp3'],
    'videos' => ['mp4', 'mkv', 'webm']
];

function getFilesRecursiveCount($dir, $allowed_exts) {
    $count = 0;
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST,
            RecursiveIteratorIterator::CATCH_GET_CHILD
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $ext = strtolower($file->getExtension());
                if (in_array($ext, $allowed_exts)) {
                    $count++;
                }
            }
        }
    } catch (Exception $e) {
        // Ignore unreadable dirs
    }
    return $count;
}

foreach ($categories as $cat) {
    $dir = $base_dir . $cat . '/';
    
    if ($cat === 'music' && !empty($settings['music_folder'])) {
        $dir = rtrim($settings['music_folder'], '/\\') . DIRECTORY_SEPARATOR;
    }

    if (is_dir($dir)) {
        $cat_count = getFilesRecursiveCount($dir, $allowed_extensions[$cat]);
        $stats[$cat] += $cat_count;
        $stats['total'] += $cat_count;
    }
}

echo json_encode(['status' => 'success', 'data' => $stats]);
?>
