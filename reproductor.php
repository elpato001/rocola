<!-- Music Visualizer Overlay -->
<div class="music-visualizer hidden" id="music-visualizer">
    <button class="close-fullscreen" style="z-index: 100;" onclick="app.toggleMusicVisualizer()"><i class="fa-solid fa-chevron-down"></i></button>
    <div class="mv-background" id="mv-background"></div>
    <canvas id="wave-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:0; pointer-events:none; filter: blur(4px); opacity: 0.8;"></canvas>
    <div class="mv-top-section" style="display: flex; width: 100%; justify-content: space-between; align-items: center; flex: 1; min-height: 0; z-index: 1;">
        <div class="mv-content">
            <div class="turntable-plinth">
                <div class="turntable-panel"></div>
                <div class="turntable-platter"></div>
                <div class="turntable-spindle"></div>
                <div class="mv-disc-container" id="mv-disc-container">
                    <div class="mv-disc" id="mv-disc">
                        <div class="mv-disc-ring mv-ring-1"></div>
                        <div class="mv-disc-ring mv-ring-2"></div>
                        <div class="mv-disc-ring mv-ring-3"></div>
                        <div class="mv-disc-cover" id="mv-disc-cover">
                            <i class="fa-solid fa-music"></i>
                        </div>
                        <div class="mv-disc-hole"></div>
                    </div>
                </div>
                <div class="tonearm-base"></div>
                <div class="tonearm" id="tonearm"></div>
                <!-- Botones de la tornamesa por estética -->
                <div class="turntable-btn" id="volume-knob" style="bottom:40px; right:40px; width:25px; height:25px;"></div>
                <div class="turntable-btn" style="bottom:40px; right:80px; width:15px; height:15px;"></div>
            </div>
            <div class="mv-info" style="display:flex; align-items:center; gap:20px;">
                <img id="mv-artist-img" src="" alt="Artist" style="width: 130px; height: 130px; border-radius: 8px; object-fit: cover; box-shadow: 0 5px 15px rgba(0,0,0,0.5); display: none;">
                <div>
                    <h2 class="mv-artist" id="mv-artist" style="margin-bottom: 5px;">-</h2>
                    <h3 class="mv-album" id="mv-album" style="margin-bottom: 15px;">-</h3>
                    <div id="mv-links" style="display:flex; gap:10px;"></div>
                </div>
            </div>
        </div>
        
        <!-- Panel de Letras -->
        <div class="mv-lyrics-panel" id="mv-lyrics-panel">
            <h3>Letra de la Canción</h3>
            <div class="mv-lyrics-content" id="mv-lyrics-content">
                <!-- Las letras se inyectarán aquí -->
                <div style="color:rgba(255,255,255,0.5); font-style:italic;">Buscando letras...</div>
            </div>
        </div>
    </div>

    <div class="mv-bottom-section" style="width: 100%; z-index: 1; padding-top: 30px; margin-bottom: 20px;">
        <div class="mv-now-tag">REPRODUCIENDO AHORA</div>
        <h1 class="mv-song" id="mv-song" style="margin-bottom: 0;">-</h1>
    </div>

</div>
<!-- Fin Music Visualizer -->
</div> <!-- Cierra content-wrapper -->

<!-- Right Side Panel (Queue) -->
<aside class="queue-panel hidden" id="queue-panel">
    <div class="queue-header">
        <h3>Cola de Reproducción</h3>
        <button class="text-btn" onclick="app.clearQueue()">Limpiar</button>
    </div>
    <div class="queue-list" id="queue-list">
        <!-- Queue items injected here -->
    </div>
</aside>
</div> <!-- Cierra main-layout -->

<!-- Persistent Bottom Player -->
<footer class="player-bar">
    <div class="now-playing" style="cursor:pointer;" title="Ver visualizador">
        <div class="cover-art" id="player-cover" onclick="app.toggleMusicVisualizer()">
            <i class="fa-solid fa-music"></i>
        </div>
        <!-- Mini video container (shown when video is minimized) -->
        <div class="mini-video-container hidden" id="mini-video-container" onclick="app.restoreFullscreenOverlay()">
        </div>
        <div class="track-info">
            <div class="track-name" id="player-title">Selecciona contenido</div>
            <div class="artist-name" id="player-artist">-</div>
        </div>
        <button class="icon-btn favorite-btn"><i class="fa-regular fa-heart"></i></button>
    </div>
    
    <div class="player-controls">
        <div class="control-buttons">
            <button class="icon-btn" id="shuffle-btn" onclick="app.toggleShuffle()" title="Aleatorio"><i class="fa-solid fa-shuffle"></i></button>
            <button class="icon-btn" onclick="app.prev()"><i class="fa-solid fa-backward-step"></i></button>
            <button class="play-btn" id="main-play-btn" onclick="app.togglePlay()"><i class="fa-solid fa-play"></i></button>
            <button class="icon-btn" onclick="app.next()"><i class="fa-solid fa-forward-step"></i></button>
            <button class="icon-btn" id="repeat-btn" onclick="app.toggleRepeat()" title="Repetir"><i class="fa-solid fa-repeat"></i></button>
        </div>
        <div class="progress-container">
            <span id="time-current">0:00</span>
            <div class="progress-bar" id="progress-bar">
                <div class="progress" id="progress"></div>
            </div>
            <span id="time-total">0:00</span>
        </div>
    </div>

    <div class="player-settings">
        <button class="icon-btn" id="queue-toggle-btn" onclick="app.toggleQueuePanel()" title="Ver Cola"><i class="fa-solid fa-list-ul"></i></button>
        <button class="icon-btn" id="fullscreen-btn" onclick="app.toggleFullscreenMode()" title="Pantalla Completa"><i class="fa-solid fa-expand"></i></button>
        <button class="icon-btn" id="mute-btn" onclick="app.toggleMute()" title="Silenciar"><i class="fa-solid fa-volume-high volume-icon" id="volume-icon-element"></i></button>
        <div class="volume-slider-container">
            <div class="progress-bar" id="volume-bar">
                <div class="progress" id="volume-progress" style="width: 100%;"></div>
            </div>
        </div>
    </div>
</footer>

<!-- Fullscreen Video/Karaoke Overlay -->
<div class="fullscreen-overlay hidden" id="fullscreen-overlay">
    <button class="fs-minimize-btn" id="fs-minimize-btn" onclick="app.minimizeFullscreenOverlay(event)" title="Minimizar video">
        <i class="fa-solid fa-down-left-and-up-right-to-center"></i>
    </button>
    <video id="video-player" class="video-element" playsinline onclick="app.togglePlay()" style="cursor: pointer;"></video>
    <div class="video-info-overlay" id="video-info-overlay">
        <h2 id="fs-title">Title</h2>
        <p id="fs-artist">Artist</p>
    </div>
</div>
