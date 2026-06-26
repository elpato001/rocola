<?php
if (!defined('ROCOLA_SYSTEM')) {
    $initial_view = basename(__FILE__, '.php');
    if ($initial_view == 'dashboard') $initial_view = 'index';
    include 'index.php';
    exit;
}
?>
<!-- Admin View -->
<div id="view-admin" class="view">
    <h1 class="view-title">Panel de Administración</h1>
    <div class="admin-layout">
        <!-- Sidebar menu -->
        <nav class="admin-sidebar">
            <ul>
                <li class="admin-tab-btn active" data-tab="admin-dashboard"><i class="fa-solid fa-chart-pie"></i> Dashboard</li>
                <li class="admin-tab-btn" data-tab="admin-library"><i class="fa-solid fa-music"></i> Biblioteca</li>
                <li class="admin-tab-btn" data-tab="admin-settings"><i class="fa-solid fa-gear"></i> Configuración</li>
                <li onclick="app.navigate('dashboard')" style="margin-top:auto; color: var(--accent)"><i class="fa-solid fa-arrow-left"></i> Volver al Inicio</li>
            </ul>
        </nav>
        
        <!-- Admin Content -->
        <div class="admin-content">
            <!-- Dashboard Tab -->
            <div id="admin-dashboard" class="admin-tab active">
                <div class="admin-stats-grid">
                    <div class="stat-card">
                        <h3>Total Medios</h3>
                        <p class="stat-value" id="stat-total">0</p>
                    </div>
                    <div class="stat-card">
                        <h3>Canciones</h3>
                        <p class="stat-value" id="stat-music">0</p>
                    </div>
                    <div class="stat-card">
                        <h3>Karaokes</h3>
                        <p class="stat-value" id="stat-karaoke">0</p>
                    </div>
                    <div class="stat-card">
                        <h3>Videos</h3>
                        <p class="stat-value" id="stat-videos">0</p>
                    </div>
                </div>
                <div class="admin-recent">
                    <h2>Actividad Reciente</h2>
                    <p style="color:var(--text-secondary); margin-top: 10px;">Sistema funcionando correctamente.</p>
                </div>
            </div>

            <!-- Library Tab -->
            <div id="admin-library" class="admin-tab" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <div>
                        <h2>Bibliotecas</h2>
                        <p style="color:var(--text-secondary); font-size:0.9rem; margin-top:5px;">Administra las carpetas locales o de red donde se encuentra tu contenido multimedia.</p>
                    </div>
                    <button class="hero-btn" style="padding: 8px 20px; font-size:0.9rem;" onclick="app.showAddLibraryModal()"><i class="fa-solid fa-plus"></i> Agregar Biblioteca</button>
                </div>
                
                <div id="libraries-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                    <!-- Library cards injected by JS -->
                </div>
            </div>

            <!-- Modal Agregar Biblioteca -->
            <div id="add-library-modal" class="modal hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;">
                <div style="background:var(--bg-panel); border:1px solid var(--border-color); padding:30px; border-radius:15px; width:600px; max-width:95%; max-height:90vh; overflow-y:auto;">
                    <h3 style="margin-bottom:20px;">Nueva Biblioteca</h3>
                    
                    <label style="display:block; margin-bottom:5px; color:var(--text-secondary);">Ruta de la carpeta</label>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="text" id="lib-ruta-display" placeholder="Escribe la ruta o usa el explorador de abajo..." style="flex:1; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-primary); border-radius:5px;">
                        <button onclick="app.toggleFolderBrowser()" class="icon-btn" style="background:var(--accent); color:white; padding:10px 15px; border-radius:5px;" title="Explorar carpetas"><i class="fa-solid fa-folder-open"></i></button>
                    </div>

                    <!-- Explorador de carpetas web -->
                    <div id="folder-browser" style="display:none; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; margin-bottom:20px; max-height:300px; overflow-y:auto;">
                        <div id="folder-breadcrumb" style="padding:10px 15px; border-bottom:1px solid var(--border-color); font-size:0.85rem; color:var(--text-secondary); display:flex; align-items:center; gap:5px; flex-wrap:wrap; position:sticky; top:0; background:var(--bg-main); z-index:1;">
                            <!-- breadcrumb injected -->
                        </div>
                        <div id="folder-list" style="padding:5px;">
                            <!-- folder items injected -->
                        </div>
                        <div style="padding:10px 15px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; position:sticky; bottom:0; background:var(--bg-main);">
                            <button class="hero-btn" style="padding:6px 20px; font-size:0.85rem;" onclick="app.selectCurrentFolder()"><i class="fa-solid fa-check"></i> Seleccionar esta carpeta</button>
                        </div>
                    </div>

                    <label style="display:block; margin-bottom:5px; color:var(--text-secondary);">Nombre de la Biblioteca</label>
                    <input type="text" id="lib-nombre" placeholder="Ej: Música Principal" style="width:100%; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-primary); border-radius:5px; margin-bottom:20px;">

                    <label style="display:block; margin-bottom:5px; color:var(--text-secondary);">Tipo de Contenido</label>
                    <select id="lib-tipo" style="width:100%; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-primary); border-radius:5px; margin-bottom:30px;">
                        <option value="musica">Música</option>
                        <option value="karaoke">Karaoke</option>
                        <option value="video">Videos Musicales</option>
                    </select>

                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button class="text-btn" onclick="app.closeAddLibraryModal()">Cancelar</button>
                        <button class="hero-btn" style="padding:8px 20px;" onclick="app.saveLibrary()">Guardar y Escanear</button>
                    </div>
                </div>
            </div>

            <!-- Modal Editar Biblioteca -->
            <div id="edit-library-modal" class="modal hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;">
                <div style="background:var(--bg-panel); border:1px solid var(--border-color); padding:30px; border-radius:15px; width:600px; max-width:95%; max-height:90vh; overflow-y:auto;">
                    <h3 style="margin-bottom:20px;">Editar Biblioteca</h3>
                    <input type="hidden" id="edit-lib-id">
                    
                    <label style="display:block; margin-bottom:5px; color:var(--text-secondary);">Ruta de la carpeta</label>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="text" id="edit-lib-ruta-display" placeholder="Escribe la ruta o usa el explorador de abajo..." style="flex:1; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-primary); border-radius:5px;">
                        <button onclick="app.toggleFolderBrowser(true)" class="icon-btn" style="background:var(--accent); color:white; padding:10px 15px; border-radius:5px;" title="Explorar carpetas"><i class="fa-solid fa-folder-open"></i></button>
                    </div>

                    <!-- Explorador de carpetas web para edición -->
                    <div id="edit-folder-browser" style="display:none; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; margin-bottom:20px; max-height:300px; overflow-y:auto;">
                        <div id="edit-folder-breadcrumb" style="padding:10px 15px; border-bottom:1px solid var(--border-color); font-size:0.85rem; color:var(--text-secondary); display:flex; align-items:center; gap:5px; flex-wrap:wrap; position:sticky; top:0; background:var(--bg-main); z-index:1;">
                            <!-- breadcrumb injected -->
                        </div>
                        <div id="edit-folder-list" style="padding:5px;">
                            <!-- folder items injected -->
                        </div>
                        <div style="padding:10px 15px; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; position:sticky; bottom:0; background:var(--bg-main);">
                            <button class="hero-btn" style="padding:6px 20px; font-size:0.85rem;" onclick="app.selectCurrentFolder(true)"><i class="fa-solid fa-check"></i> Seleccionar esta carpeta</button>
                        </div>
                    </div>

                    <label style="display:block; margin-bottom:5px; color:var(--text-secondary);">Nombre de la Biblioteca</label>
                    <input type="text" id="edit-lib-nombre" placeholder="Ej: Música Principal" style="width:100%; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-primary); border-radius:5px; margin-bottom:20px;">

                    <label style="display:block; margin-bottom:5px; color:var(--text-secondary);">Tipo de Contenido</label>
                    <select id="edit-lib-tipo" style="width:100%; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-primary); border-radius:5px; margin-bottom:30px;">
                        <option value="musica">Música</option>
                        <option value="karaoke">Karaoke</option>
                        <option value="video">Videos Musicales</option>
                    </select>

                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button class="text-btn" onclick="app.closeEditLibraryModal()">Cancelar</button>
                        <button class="hero-btn" style="padding:8px 20px;" onclick="app.saveEditLibrary()">Guardar Cambios</button>
                    </div>
                </div>
            </div>

            <!-- Settings Tab -->
            <div id="admin-settings" class="admin-tab" style="display:none;">
                <h2>Configuración Global</h2>
                <div style="background:var(--bg-panel); border-radius:10px; border:1px solid var(--border-color); padding: 25px; margin-top:20px;">
                    <p style="color:var(--text-secondary);">Ajustes de la Rockola (Almacenados localmente)</p>
                    <div style="margin-top:20px;">
                        <label style="display:block; margin-bottom:10px;">Volumen Inicial Predeterminado</label>
                        <input type="range" id="admin-vol-default" min="0" max="1" step="0.1" value="0.5" style="width:100%; max-width:300px;">
                        
                        <label style="display:block; margin-top:20px; margin-bottom:10px;">Zoom de Interfaz (Tamaño general)</label>
                        <div style="display:flex; align-items:center; gap:15px; max-width:300px;">
                            <input type="range" id="admin-zoom-default" min="0.5" max="2" step="0.1" value="1" style="flex-grow:1;" oninput="document.getElementById('zoom-val').textContent = this.value + 'x'; document.body.style.zoom = this.value;">
                            <span id="zoom-val" style="color:var(--text-secondary); width:30px;">1x</span>
                        </div>
                        
                        <label style="display:block; margin-top:20px; margin-bottom:10px;">Carpeta Externa de Música (Ruta Windows)</label>
                        <input type="text" id="admin-music-folder" placeholder="Ej: C:\Users\Pato\Music" style="width:100%; max-width:500px; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-primary); border-radius:5px;">
                        
                        <div style="display:flex; gap:15px; margin-top:30px; flex-wrap:wrap;">
                            <button class="hero-btn" style="padding: 8px 20px; font-size:0.9rem;" onclick="app.saveSettings()"><i class="fa-solid fa-save"></i> Guardar Ajustes</button>
                            <button class="text-btn" style="padding: 8px 20px; font-size:0.9rem; border:1px solid var(--border-color); border-radius:30px;" onclick="app.calibrateTouchScreen()"><i class="fa-solid fa-hand-pointer"></i> Calibrar Pantalla Táctil</button>
                        </div>
                        
                        <!-- Sync Artist Images Section -->
                        <div style="margin-top:40px; padding-top:20px; border-top:1px solid var(--border-color);">
                            <h3 style="margin-bottom:10px; font-size:1.1rem;"><i class="fa-solid fa-cloud-arrow-down"></i> Wallpapers de Artistas</h3>
                            <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:15px;">Descargar y guardar localmente todas las imágenes de los artistas para usarlas sin conexión.</p>
                            
                            <div id="sync-artist-container" style="display:flex; align-items:center; gap:15px;">
                                <button id="btn-sync-artists" class="hero-btn" style="padding: 8px 20px; font-size:0.9rem; background:linear-gradient(135deg, #00C2FF, #0055FF);" onclick="app.syncArtistImages()">
                                    <i class="fa-solid fa-download"></i> Descargar Todas
                                </button>
                            </div>
                            
                            <!-- Progress Bar -->
                            <div id="sync-progress-wrapper" class="hidden" style="margin-top:20px; max-width:500px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <span id="sync-progress-text" style="font-size:0.8rem; font-weight:bold;">Descargando...</span>
                                    <span id="sync-progress-count" style="font-size:0.8rem; color:var(--text-secondary);">0 / 0</span>
                                </div>
                                <div style="width:100%; height:10px; background:var(--bg-main); border-radius:5px; overflow:hidden;">
                                    <div id="sync-progress-bar" style="height:100%; width:0%; background:var(--accent); transition:width 0.3s;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
