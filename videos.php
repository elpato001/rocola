<?php
if (!defined('ROCOLA_SYSTEM')) {
    $initial_view = basename(__FILE__, '.php');
    if ($initial_view == 'dashboard') $initial_view = 'index';
    include 'index.php';
    exit;
}
?>
<!-- Videos Views -->
<!-- La interfaz de Videos comparte dinámicamente los contenedores de musica.php (view-artists, view-albums, view-songs) a través de app.js -->
<!-- Este archivo está reservado para futuras estructuras exclusivas de la sección de Videos Musicales -->
