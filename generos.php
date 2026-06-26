<?php
if (!defined('ROCOLA_SYSTEM')) {
    $initial_view = basename(__FILE__, '.php');
    if ($initial_view == 'dashboard') $initial_view = 'index';
    include 'index.php';
    exit;
}
?>
<!-- Category View (Library Grid) -->
<div id="view-category" class="view">
    <button class="back-btn" onclick="app.navigate('dashboard')"><i class="fa-solid fa-arrow-left"></i> Volver</button>
    <h1 class="view-title" id="category-title">Categoría</h1>
    <div class="library-grid" id="library-grid">
        <!-- Items injected via JS -->
    </div>
</div>

<!-- Genres View -->
<div id="view-genres" class="view">
    <button class="back-btn" onclick="app.navigate('dashboard')"><i class="fa-solid fa-arrow-left"></i> Inicio</button>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
        <h1 class="view-title" style="margin:0;">Estilos Musicales</h1>
        <div style="position:relative; width:400px; max-width:50%;">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:15px; top:50%; transform:translateY(-50%); color:var(--text-secondary);"></i>
            <input type="text" id="genre-search" placeholder="Buscar estilo..." style="width:100%; padding:15px 15px 15px 45px; border-radius:30px; border:none; background:var(--bg-panel); color:var(--text-primary); font-size:1.1rem; outline:none;">
        </div>
    </div>
    <div class="artists-grid" id="genres-grid">
        <!-- Genres injected via JS -->
    </div>
</div>
