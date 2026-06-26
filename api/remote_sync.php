<?php
// api/remote_sync.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$queueFile = __DIR__ . '/remote_queue.json';

// Initialize queue file if it doesn't exist
if (!file_exists($queueFile)) {
    file_put_contents($queueFile, json_encode([]));
}

$action = $_GET['action'] ?? '';

if ($action === 'push') {
    // Phone sends a command
    $cmd = $_POST['cmd'] ?? '';
    $val = $_POST['val'] ?? '';
    if ($cmd) {
        $queue = json_decode(file_get_contents($queueFile), true);
        if (!is_array($queue)) $queue = [];
        $queue[] = ['cmd' => $cmd, 'val' => $val, 'timestamp' => time()];
        file_put_contents($queueFile, json_encode($queue));
        echo json_encode(['status' => 'success', 'message' => 'Command queued']);
        exit;
    }
    echo json_encode(['status' => 'error', 'message' => 'Missing command']);
    exit;
}

if ($action === 'poll') {
    // Kiosk checks for commands
    $queue = json_decode(file_get_contents($queueFile), true);
    if (!empty($queue)) {
        // Clear the queue
        file_put_contents($queueFile, json_encode([]));
        echo json_encode(['status' => 'success', 'commands' => $queue]);
        exit;
    }
    echo json_encode(['status' => 'empty', 'commands' => []]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
?>
