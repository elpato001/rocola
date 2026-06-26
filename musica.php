<?php
if (!defined('ROCOLA_SYSTEM')) {
    $initial_view = basename(__FILE__, '.php');
    if ($initial_view == 'dashboard') $initial_view = 'index';
    include 'index.php';
    exit;
}
?>
<!-- Music Artists View -->
<div id="view-artists" class="view">
    <button class="back-btn" onclick="app.navigate('dashboard')"><i class="fa-solid fa-arrow-left"></i> Inicio</button>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
        <h1 class="view-title" id="artists-view-title" style="margin:0;">Artistas</h1>
        <div style="position:relative; width:400px; max-width:50%;">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:15px; top:50%; transform:translateY(-50%); color:var(--text-secondary);"></i>
            <input type="text" id="artist-search" placeholder="Buscar artista..." style="width:100%; padding:15px 15px 15px 45px; border-radius:30px; border:none; background:var(--bg-panel); color:var(--text-primary); font-size:1.1rem; outline:none;">
        </div>
    </div>
    <div class="artists-grid" id="artists-grid">
        <!-- Artists injected via JS -->
    </div>
</div>

<!-- Music Albums View -->
<div id="view-albums" class="view">
    <button class="back-btn" onclick="app.navigate('artists')"><i class="fa-solid fa-arrow-left"></i> Volver</button>
    <div class="artist-header" id="artist-header" style="display:flex; align-items:center; gap:30px; margin-bottom:40px;">
        <!-- Artist Info injected via JS -->
    </div>
    <h2 style="margin-bottom:20px; font-size:1.5rem;">Álbumes</h2>
    <div class="albums-grid" id="albums-grid">
        <!-- Albums injected via JS -->
    </div>
</div>

<!-- Music Songs View -->
<div id="view-songs" class="view">
    <button class="back-btn" id="btn-back-to-albums" onclick="app.navigate('albums')"><i class="fa-solid fa-arrow-left"></i> Volver a Álbumes</button>
    <div class="album-header" id="album-header" style="display:flex; align-items:flex-end; gap:30px; margin-bottom:40px; background:linear-gradient(transparent, var(--bg-main)); padding-bottom:20px;">
        <!-- Album Info injected via JS -->
    </div>
    <div class="songs-list" id="songs-list">
        <!-- Songs injected via JS -->
    </div>
</div>
