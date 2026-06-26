<?php
// api/calibrate.php
header('Content-Type: application/json');

// Ejecutar la herramienta nativa de calibración táctil de Windows
try {
    // tabcal es la herramienta de calibración de Tablet PC en Windows
    // Usamos pclose(popen()) para que se ejecute en segundo plano y no bloquee PHP
    pclose(popen("start tabcal", "r"));
    
    echo json_encode(['status' => 'success', 'message' => 'Herramienta de calibración de Windows iniciada.']);
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'No se pudo iniciar la herramienta de calibración. ' . $e->getMessage()]);
}
?>
