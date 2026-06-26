<?php
if (!defined('ROCOLA_SYSTEM')) {
    $initial_view = basename(__FILE__, '.php');
    if ($initial_view == 'dashboard') $initial_view = 'index';
    include 'index.php';
    exit;
}
?>
<!-- Dashboard View -->
<div id="view-dashboard" class="view active">
    <div style="display: flex; gap: 40px; flex-wrap: wrap;">
    <!-- Left Column -->
    <div style="flex: 1; min-width: 300px;">
        <h2 class="section-title">Explorar Categorías <i class="fa-solid fa-chevron-right section-arrow"></i></h2>
        <div class="horizontal-scroll-container">
            <div class="deezer-cat-card" onclick="app.navigate('music')">
                <div class="card-bg" style="background-image: linear-gradient(135deg, rgba(255,0,85,0.5), rgba(128,0,255,0.6)), url('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80');"></div>
                <i class="fa-solid fa-headphones"></i>
                <h3>Música</h3>
            </div>
            <div class="deezer-cat-card" onclick="app.navigate('karaoke')">
                <div class="card-bg" style="background-image: linear-gradient(135deg, rgba(0,194,255,0.5), rgba(0,85,255,0.6)), url('https://images.unsplash.com/photo-1493225457124-a1a2a5956020?auto=format&fit=crop&w=500&q=80');"></div>
                <i class="fa-solid fa-microphone-lines"></i>
                <h3>Karaoke</h3>
            </div>
            <div class="deezer-cat-card" onclick="app.navigate('videos')">
                <div class="card-bg" style="background-image: linear-gradient(135deg, rgba(255,184,0,0.5), rgba(255,85,0,0.6)), url('https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=500&q=80');"></div>
                <i class="fa-solid fa-film"></i>
                <h3>Videos Musicales</h3>
            </div>
            <div class="deezer-cat-card" onclick="app.navigate('genres')">
                <div class="card-bg" style="background-image: linear-gradient(135deg, rgba(0,255,136,0.5), rgba(0,184,255,0.6)), url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80');"></div>
                <i class="fa-solid fa-guitar"></i>
                <h3>Estilos Musicales</h3>
            </div>
        </div>

        <h2 class="section-title">Recomendado para ti <i class="fa-solid fa-chevron-right section-arrow"></i></h2>
        <div class="horizontal-scroll-container" id="recent-container">
            <!-- Cards will be injected via JS -->
        </div>

        <h2 class="section-title">Últimos Artistas <i class="fa-solid fa-user-plus" style="color: var(--text-secondary); margin-left: 5px;"></i></h2>
        <div class="horizontal-scroll-container" id="newest-container">
            <!-- Cards will be injected via JS -->
        </div>
    </div>

    <!-- Right Column (Top List) -->
    <div style="width: 350px; flex-shrink: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); display: flex; flex-direction: column; max-height: calc(100vh - 200px);" class="dashboard-sidebar">
        <h2 class="section-title" id="top-title" style="display:none; margin-bottom: 20px; font-size: 1.3rem; margin-top: 0; flex-shrink: 0;">Top Escuchados <i class="fa-solid fa-fire" style="color: var(--accent); margin-left: 5px;"></i></h2>
        <div id="top-container" style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 5px; flex-grow: 1;">
        </div>
    </div>
    </div>
</div>
