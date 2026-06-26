<?php
// api/state.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$stateFile = __DIR__ . '/state.json';

if (!file_exists($stateFile)) {
    file_put_contents($stateFile, json_encode([
        'isPlaying' => false, 
        'item' => null,
        'currentTime' => 0,
        'duration' => 0,
        'isShuffle' => false,
        'repeatMode' => 0,
        'timestamp' => time() * 1000
    ]));
}

$action = $_GET['action'] ?? '';

if ($action === 'push') {
    $itemStr = $_POST['item'] ?? '';
    $isPlaying = $_POST['isPlaying'] ?? 'false';
    $currentTime = floatval($_POST['currentTime'] ?? 0);
    $duration = floatval($_POST['duration'] ?? 0);
    $isShuffle = $_POST['isShuffle'] === 'true';
    $repeatMode = intval($_POST['repeatMode'] ?? 0);
    
    $item = json_decode($itemStr, true);
    
    $state = [
        'isPlaying' => $isPlaying === 'true',
        'item' => $item,
        'currentTime' => $currentTime,
        'duration' => $duration,
        'isShuffle' => $isShuffle,
        'repeatMode' => $repeatMode,
        'timestamp' => round(microtime(true) * 1000)
    ];
    
    file_put_contents($stateFile, json_encode($state));
    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'get') {
    $state = json_decode(file_get_contents($stateFile), true);
    $state['server_time'] = round(microtime(true) * 1000);
    echo json_encode(['status' => 'success', 'data' => $state]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
?>
