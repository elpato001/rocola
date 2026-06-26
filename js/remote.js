// js/remote.js

let currentGenero = null; // Para filtrar la biblioteca

function sendCommand(cmd, val = '') {
    const light = document.getElementById('status-light');
    light.classList.add('sending');
    
    // Play button visual toggle
    if(cmd === 'play_pause') {
        const icons = [document.querySelector('#mp-play'), document.querySelector('#np-large-play')];
        icons.forEach(icon => {
            if(icon && icon.classList.contains('fa-play')) {
                icon.classList.replace('fa-play', 'fa-pause');
            } else if(icon) {
                icon.classList.replace('fa-pause', 'fa-play');
            }
        });
    }

    const formData = new FormData();
    formData.append('cmd', cmd);
    formData.append('val', val);

    fetch('api/remote_sync.php?action=push', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        setTimeout(() => light.classList.remove('sending'), 200);
    })
    .catch(err => {
        console.error('Network Error', err);
        light.classList.remove('sending');
        light.style.background = 'red';
        setTimeout(() => light.style.background = '#555', 500);
    });
}

const buttons = document.querySelectorAll('.filter-pill, .nav-item, .card, .grid-item');
buttons.forEach(btn => {
    btn.addEventListener('touchstart', () => {
        if (navigator.vibrate) navigator.vibrate(50);
    }, {passive: true});
});

// ==========================================
// Keep Screen Awake (NoSleep.js)
// ==========================================
let noSleep = null;

function enableNoSleep() {
    if (!noSleep && typeof NoSleep !== 'undefined') {
        noSleep = new NoSleep();
    }
    if (noSleep && !noSleep.isEnabled) {
        noSleep.enable();
        console.log('NoSleep activated (Screen will stay on)');
    }
}

// Browsers require a direct user interaction to play the hidden video
document.addEventListener('click', enableNoSleep, { once: true });
document.addEventListener('touchstart', enableNoSleep, { once: true });

// View Switching
function switchView(viewName, navElement) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById('view-' + viewName).classList.add('active');
    if (navElement) {
        navElement.classList.add('active');
    }
    
    if(viewName === 'library' && (!window.artistsLoaded || currentGenero)) {
        loadArtists();
    }
}

// Update Mini-Player & Now Playing
let currentPlayingId = null;

function updateMiniPlayer(item) {
    if (!item) return;
    const coverUrl = item.portada || 'https://ui-avatars.com/api/?name=Rocola&background=181818&color=b3b3b3';
    const title = item.name || item.titulo;
    const artist = item.artista;

    currentPlayingId = item.id || title;

    // Update Mini Player
    document.getElementById('mp-cover').src = coverUrl;
    document.getElementById('mp-title').textContent = title;
    document.getElementById('mp-artist').textContent = artist;
    
    // Update Now Playing Overlay
    document.getElementById('np-large-cover').src = coverUrl;
    document.getElementById('np-bg-blur').style.backgroundImage = `url('${coverUrl}')`;
    document.getElementById('np-large-title').textContent = title;
    document.getElementById('np-large-artist').textContent = artist;
    
    // Load lyrics
    loadLyricsForRemote(item);
}

let remoteCurrentTime = 0;
let remoteDuration = 0;
let remoteIsPlaying = false;
let lastSyncTimestamp = 0;
let progressInterval = null;

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateProgressBar() {
    if (!remoteDuration) return;
    let time = remoteCurrentTime;
    
    // Simulate time passing if playing
    if (remoteIsPlaying && lastSyncTimestamp > 0) {
        const elapsed = (Date.now() - lastSyncTimestamp) / 1000;
        time += elapsed;
        if (time > remoteDuration) time = remoteDuration;
    }
    
    const percent = (time / remoteDuration) * 100;
    document.getElementById('np-progress-fill').style.width = `${percent}%`;
    document.getElementById('np-time-current').textContent = formatTime(time);
    document.getElementById('np-time-total').textContent = formatTime(remoteDuration);
    
    // Sync lyrics if showing
    if (showingLyrics && currentLyrics.length > 0) {
        let activeIdx = -1;
        for (let i = 0; i < currentLyrics.length; i++) {
            if (time >= currentLyrics[i].time) activeIdx = i;
            else break;
        }
        
        const lines = document.querySelectorAll('.lyric-line');
        lines.forEach((l, idx) => {
            if (idx === activeIdx) {
                if(!l.classList.contains('active')) {
                    l.classList.add('active');
                    const container = document.getElementById('np-lyrics-container');
                    container.scrollTop = l.offsetTop - container.offsetTop - (container.clientHeight / 2) + (l.clientHeight / 2);
                }
            } else {
                l.classList.remove('active');
            }
        });
    }
}

function toggleHeart(el) {
    if(navigator.vibrate) navigator.vibrate(50);
    if(el.classList.contains('fa-regular')) {
        el.classList.replace('fa-regular', 'fa-solid');
        el.style.color = 'var(--app-accent)';
    } else {
        el.classList.replace('fa-solid', 'fa-regular');
        el.style.color = 'var(--app-secondary-text)';
    }
}

function seekFromRemote(e) {
    if(!remoteDuration) return;
    const bar = document.getElementById('np-progress-bar');
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const targetTime = percent * remoteDuration;
    
    // Optimistic UI update
    remoteCurrentTime = targetTime;
    lastSyncTimestamp = Date.now();
    updateProgressBar();
    
    sendCommand('seek', targetTime);
}

// Lyrics Logic
let currentLyrics = [];
let showingLyrics = false;

function toggleCoverLyrics() {
    showingLyrics = !showingLyrics;
    const toggleBtn = document.getElementById('np-view-toggle');
    if (showingLyrics) {
        document.getElementById('np-cover-container').classList.add('hidden');
        document.getElementById('np-lyrics-container').classList.add('active');
        if(toggleBtn) toggleBtn.textContent = 'PORTADA';
    } else {
        document.getElementById('np-cover-container').classList.remove('hidden');
        document.getElementById('np-lyrics-container').classList.remove('active');
        if(toggleBtn) toggleBtn.textContent = 'LETRAS';
    }
}

function loadLyricsForRemote(item) {
    const container = document.getElementById('np-lyrics-container');
    container.innerHTML = '<p style="color:var(--app-secondary-text); margin-top:20px;">Buscando letras...</p>';
    currentLyrics = [];
    
    fetch(`api/lyrics.php?artist=${encodeURIComponent(item.artista || '')}&title=${encodeURIComponent(item.name || item.titulo || '')}`)
        .then(res => res.json())
        .then(data => {
            if(data.found) {
                if(data.syncedLyrics) {
                    currentLyrics = parseSyncedLyrics(data.syncedLyrics);
                    renderLyrics();
                } else if(data.plainLyrics) {
                    container.innerHTML = `<p style="white-space:pre-wrap; text-align:center; font-size:1.1rem; line-height:1.5;">${data.plainLyrics}</p>`;
                }
            } else {
                container.innerHTML = '<p style="color:var(--app-secondary-text); margin-top:20px;">Letra no disponible.</p>';
            }
        });
}

function parseSyncedLyrics(lrc) {
    const lines = lrc.split('\n');
    const synced = [];
    lines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const mins = parseInt(match[1]);
            const secs = parseInt(match[2]);
            const ms = parseInt(match[3].padEnd(3, '0'));
            const timeInSeconds = mins * 60 + secs + ms / 1000;
            const text = match[4].trim();
            if(text) synced.push({ time: timeInSeconds, text });
        }
    });
    return synced;
}

function renderLyrics() {
    const container = document.getElementById('np-lyrics-container');
    container.innerHTML = '';
    currentLyrics.forEach((line, index) => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.textContent = line.text;
        p.id = `lyric-line-${index}`;
        container.appendChild(p);
    });
}

// State Polling to keep remote synced
function pollState() {
    fetch('api/state.php?action=get')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                const state = data.data;
                const item = state.item;
                
                if (item) {
                    const itemId = item.id || item.name;
                    // Update track info if changed
                    if (currentPlayingId !== itemId) {
                        updateMiniPlayer(item);
                        // Reset heart on track change
                        const heart = document.getElementById('np-heart');
                        if(heart) {
                            heart.classList.replace('fa-solid', 'fa-regular');
                            heart.style.color = 'var(--app-secondary-text)';
                        }
                    }
                }
                
                // Sync Play/Pause state
                remoteIsPlaying = state.isPlaying;
                const mpPlay = document.getElementById('mp-play');
                const npPlay = document.getElementById('np-large-play');
                
                if (remoteIsPlaying) {
                    if (mpPlay.classList.contains('fa-play')) mpPlay.classList.replace('fa-play', 'fa-pause');
                    if (npPlay.classList.contains('fa-play')) npPlay.classList.replace('fa-play', 'fa-pause');
                } else {
                    if (mpPlay.classList.contains('fa-pause')) mpPlay.classList.replace('fa-pause', 'fa-play');
                    if (npPlay.classList.contains('fa-pause')) npPlay.classList.replace('fa-pause', 'fa-play');
                }
                
                // Sync Time
                if (state.timestamp) {
                    const serverTime = state.server_time || Date.now();
                    const age = Math.max(0, serverTime - state.timestamp);
                    
                    remoteCurrentTime = (state.currentTime || 0) + (remoteIsPlaying ? (age / 1000) : 0);
                    remoteDuration = state.duration || 0;
                    lastSyncTimestamp = Date.now(); // Local time for local tracking
                    updateProgressBar();
                }
                
                // Sync Shuffle
                const shuffleBtn = document.getElementById('np-shuffle');
                if (shuffleBtn) {
                    if (state.isShuffle) shuffleBtn.style.color = 'var(--app-accent)';
                    else shuffleBtn.style.color = 'var(--app-secondary-text)';
                }
                
                // Sync Repeat
                const repeatBtn = document.getElementById('np-repeat');
                if (repeatBtn) {
                    if (state.repeatMode === 1) { // Repeat All
                        repeatBtn.classList.replace('fa-repeat-1', 'fa-repeat');
                        repeatBtn.style.color = 'var(--app-accent)';
                    } else if (state.repeatMode === 2) { // Repeat One
                        repeatBtn.classList.replace('fa-repeat', 'fa-repeat-1');
                        repeatBtn.style.color = 'var(--app-accent)';
                    } else { // Repeat Off
                        repeatBtn.classList.replace('fa-repeat-1', 'fa-repeat');
                        repeatBtn.style.color = 'var(--app-secondary-text)';
                    }
                }
            }
        })
        .catch(err => console.error('Sync Error', err));
}

// Poll state every 2 seconds
setInterval(pollState, 2000);
pollState(); // Initial load
setTimeout(() => sendCommand('request_state'), 500); // Ask main app to publish its real state

// Local smooth progress bar update
setInterval(updateProgressBar, 1000);

// Now Playing Overlay Toggle
function toggleNowPlaying(show) {
    const overlay = document.getElementById('now-playing-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

document.getElementById('mini-player').addEventListener('click', (e) => {
    if(e.target.id === 'mp-play' || e.target.closest('#mp-play')) return;
    toggleNowPlaying(true);
});

// Search Logic
const searchInput = document.getElementById('remote-search');
const resultsContainer = document.getElementById('remote-search-results');
let searchTimeout;

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const q = e.target.value.trim();
        
        if (q.length < 2) {
            resultsContainer.innerHTML = '<p style="color:var(--app-secondary-text); text-align:center; margin-top:30px; font-weight:700;">Explora todo el catálogo</p>';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            fetch(`api/search.php?q=${encodeURIComponent(q)}`)
                .then(res => res.json())
                .then(data => {
                    resultsContainer.innerHTML = '';
                    if (data.status === 'success' && data.data.length > 0) {
                        data.data.forEach(item => {
                            const div = document.createElement('div');
                            div.className = 'list-item';
                            const isArtist = item.type === 'artist' ? 'artist' : '';
                            div.innerHTML = `
                                <img src="${item.portada}" alt="Cover" class="${isArtist}">
                                <div class="list-info">
                                    <h4>${item.name}</h4>
                                    <p>${item.artista} ${item.type === 'music' ? '• Canción' : ''}</p>
                                </div>
                                <div class="list-action"><i class="fa-solid fa-ellipsis-vertical"></i></div>
                            `;
                            div.onclick = () => {
                                if (navigator.vibrate) navigator.vibrate(50);
                                if(item.type !== 'artist' && item.type !== 'album') {
                                    sendCommand('play_item', JSON.stringify(item));
                                    updateMiniPlayer(item);
                                } else {
                                    // Handle artist/album click from search in remote?
                                    // For simplicity, play_item on song.
                                }
                            };
                            resultsContainer.appendChild(div);
                        });
                    } else {
                        resultsContainer.innerHTML = '<p style="text-align:center; color:var(--app-secondary-text); margin-top:20px;">No se encontraron resultados.</p>';
                    }
                })
                .catch(err => console.error(err));
        }, 300);
    });
}

// Data Fetching: Inicio
function loadTopTracks() {
    const container = document.getElementById('remote-top-tracks');
    fetch('api/top.php').then(res=>res.json()).then(data => {
        container.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(song => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img src="${song.portada}">
                    <h4>${song.name}</h4>
                    <p>${song.artista}</p>
                `;
                card.onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    sendCommand('play_item', JSON.stringify(song));
                    updateMiniPlayer(song);
                };
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="color:var(--app-secondary-text); font-size:0.9rem;">Aún no hay reproducciones</p>';
        }
    });
}

function loadGenres() {
    const container = document.getElementById('remote-genres');
    fetch('api/generos.php').then(res=>res.json()).then(data => {
        container.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(genre => {
                const card = document.createElement('div');
                card.className = 'grid-item';
                card.innerHTML = `
                    <img src="${genre.imagen}" style="border-radius: 4px;">
                    <h4>${genre.nombre}</h4>
                `;
                card.onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    currentGenero = genre.nombre;
                    // Switch to library view
                    document.querySelectorAll('.nav-item')[2].click();
                };
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="color:var(--app-secondary-text); font-size:0.9rem;">No se encontraron géneros.</p>';
        }
    });
}

// Data Fetching: Library
const libContent = document.getElementById('remote-library-content');
const btnLibBack = document.getElementById('btn-lib-back');
const libTitle = document.getElementById('lib-main-title');

function loadArtists() {
    window.artistsLoaded = true;
    btnLibBack.style.display = 'none';
    libTitle.textContent = currentGenero ? currentGenero : 'Tu biblioteca';
    
    libContent.innerHTML = '<p style="text-align:center;color:var(--app-secondary-text); margin-top:20px;">Cargando...</p>';
    
    let url = 'api/artistas.php?tipo=musica';
    if(currentGenero) url += '&genero=' + encodeURIComponent(currentGenero);
    
    fetch(url).then(res=>res.json()).then(data => {
        libContent.innerHTML = '';
        if(currentGenero) {
            // Add clear filter pill
            const clearPill = document.createElement('div');
            clearPill.innerHTML = `<span style="background:#242424; padding:5px 12px; border-radius:15px; font-size:0.8rem; margin-bottom:15px; display:inline-block; cursor:pointer;"><i class="fa-solid fa-xmark"></i> Quitar filtro</span>`;
            clearPill.onclick = () => { currentGenero = null; loadArtists(); };
            libContent.appendChild(clearPill);
        }

        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(artist => {
                const item = document.createElement('div');
                item.className = 'list-item artist';
                item.innerHTML = `
                    <img src="${artist.imagen}" alt="${artist.nombre}">
                    <div class="list-info">
                        <h4>${artist.nombre}</h4>
                        <p>Artista</p>
                    </div>
                `;
                item.onclick = () => loadAlbums(artist);
                libContent.appendChild(item);
            });
        } else {
            libContent.innerHTML += '<p style="text-align:center;color:var(--app-secondary-text);">No hay artistas aquí.</p>';
        }
    });
}

function loadAlbums(artist) {
    btnLibBack.style.display = 'block';
    libTitle.textContent = artist.nombre;
    btnLibBack.onclick = () => loadArtists();
    
    libContent.innerHTML = '<p style="text-align:center;color:var(--app-secondary-text); margin-top:20px;">Cargando discos...</p>';
    
    let url = `api/albumes.php?artista_id=${artist.id}&tipo=musica`;
    if(currentGenero) url += '&genero=' + encodeURIComponent(currentGenero);
    
    fetch(url).then(res=>res.json()).then(data => {
        libContent.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach(album => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <img src="${album.portada}" alt="${album.nombre}" style="border-radius:4px;">
                    <div class="list-info">
                        <h4>${album.nombre}</h4>
                        <p>${album.anio || ''} • ${album.cantidad_canciones} pistas</p>
                    </div>
                `;
                item.onclick = () => loadSongs(album, artist);
                libContent.appendChild(item);
            });
        } else {
            libContent.innerHTML = '<p style="text-align:center;color:var(--app-secondary-text);">No hay discos.</p>';
        }
    });
}

function loadSongs(album, artist) {
    btnLibBack.style.display = 'block';
    libTitle.textContent = album.nombre;
    btnLibBack.onclick = () => loadAlbums(artist);
    
    libContent.innerHTML = '<p style="text-align:center;color:var(--app-secondary-text); margin-top:20px;">Cargando pistas...</p>';
    
    let url = `api/canciones.php?album_id=${album.id}&artista_id=${artist.id}&tipo=musica`;
    if(currentGenero) url += '&genero=' + encodeURIComponent(currentGenero);
    
    fetch(url).then(res=>res.json()).then(data => {
        libContent.innerHTML = '';
        if(data.status === 'success' && data.data.length > 0) {
            data.data.forEach((song, index) => {
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML = `
                    <div class="list-info" style="padding-left:10px;">
                        <h4>${song.name}</h4>
                        <p>${artist.nombre}</p>
                    </div>
                    <div class="list-action"><i class="fa-solid fa-play" style="color:var(--app-accent);"></i></div>
                `;
                div.onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    // Format item correctly for playback
                    const item = {
                        id: song.id,
                        name: song.name,
                        url: song.url || song.ruta_completa,
                        portada: album.portada,
                        artista: artist.nombre,
                        type: 'music'
                    };
                    sendCommand('play_item', JSON.stringify(item));
                    updateMiniPlayer(item);
                };
                libContent.appendChild(div);
            });
        } else {
            libContent.innerHTML = '<p style="text-align:center;color:var(--app-secondary-text);">No hay pistas.</p>';
        }
    });
}

// Initial loads
loadTopTracks();
loadGenres();
