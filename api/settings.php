<?php
header('Content-Type: application/json');

$settings_file = '../data/settings.json';

if (!file_exists('../data')) {
    mkdir('../data', 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($settings_file)) {
        echo file_get_contents($settings_file);
    } else {
        echo json_encode(['volume' => 0.5]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = file_get_contents('php://input');
    if ($data) {
        file_put_contents($settings_file, $data);
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'No data']);
    }
    exit;
}
?>
