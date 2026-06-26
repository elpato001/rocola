<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['type']) || !isset($data['filename'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing parameters']);
    exit;
}

$type = $data['type'];
$filename = $data['filename'];
$allowed_types = ['music', 'karaoke', 'videos'];

if (!in_array($type, $allowed_types)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid type']);
    exit;
}

$settings_file = '../data/settings.json';
$settings = [];
if (file_exists($settings_file)) {
    $settings = json_decode(file_get_contents($settings_file), true) ?: [];
}

$filename = basename($filename);
$dir = '../media/' . $type . '/';

if ($type === 'music' && !empty($settings['music_folder'])) {
    $dir = rtrim($settings['music_folder'], '/\\') . DIRECTORY_SEPARATOR;
}

$filepath = $dir . $filename;

if (file_exists($filepath)) {
    if (unlink($filepath)) {
        echo json_encode(['status' => 'success', 'message' => 'File deleted']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete file']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'File not found']);
}
?>
