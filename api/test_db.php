<?php
require_once 'db.php';
try {
    $stmt = $pdo->query("DESCRIBE multimedia");
    print_r($stmt->fetchAll());
} catch (PDOException $e) {
    echo $e->getMessage();
}
?>
