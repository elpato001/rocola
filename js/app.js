const app = (() => {
    // State
    let mediaData = { music: [], karaoke: [], videos: [] };
    let queue = [];
    let currentIndex = -1;
    let isPlaying = false;
    let isFullscreen = false;
    let currentSyncedLyrics = [];
    let activeLyricIndex = -1;
    let repeatMode = 0; // 0: none, 1: all, 2: one
    let isShuffle = false;
    let originalQueue = [];
    
    // Web Audio API Variables
    let audioCtx = null;
    let analyser = null;
    let sourceNode = null;
    let dataArray = null;
    let visualizerAnimationFrame = null;

    function initAudioVisualizer() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 512; // 256 bins for smooth waves and accurate bass detection
                const audioPlayer = document.getElementById('audio-player');
                sourceNode = audioCtx.createMediaElementSource(audioPlayer);
                sourceNode.connect(analyser);
                analyser.connect(audioCtx.destination);
                dataArray = new Uint8Array(analyser.frequencyBinCount);
            } catch(e) { console.error('AudioContext error', e); }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        renderAudioVisualizer();
    }

    function renderAudioVisualizer() {
        if (visualizerAnimationFrame) {
            cancelAnimationFrame(visualizerAnimationFrame);
        }
        
        const bg = document.getElementById('mv-background');
        const canvas = document.getElementById('wave-canvas');
        const ctx = canvas ? canvas.getContext('2d') : null;
        let timeDataArray = null;
        if (analyser) {
            timeDataArray = new Uint8Array(analyser.frequencyBinCount);
        }
        
        function draw() {
            visualizerAnimationFrame = requestAnimationFrame(draw);
            
            if (canvas && ctx) {
                if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
            }

            if (isPlaying && analyser && dataArray && timeDataArray) {
                analyser.getByteFrequencyData(dataArray);
                
                // Average the lowest 4 frequency bins for bass
                let sum = 0;
                for (let i = 0; i < 4; i++) {
                    sum += dataArray[i];
                }
                const average = sum / 4;
                
                // Calculate dynamic scale and brightness based on bass intensity
                // Increased scale and brightness to make the effect much more noticeable
                const scale = 1.3 + (average / 255) * 0.4; // Up to 1.7 scale
                const brightness = 0.3 + (average / 255) * 0.8; // Up to 1.1 brightness
                
                if (bg) {
                    bg.style.transition = 'transform 0.05s ease-out, filter 0.05s ease-out';
                    bg.style.transform = `scale(${scale})`;
                    bg.style.filter = `blur(60px) brightness(${brightness}) saturate(1.5)`;
                }
                
                // Canvas Wave Drawing
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    analyser.getByteTimeDomainData(timeDataArray);
                    
                    const rootStyles = getComputedStyle(document.documentElement);
                    const ambientColor = rootStyles.getPropertyValue('--ambient-rgb').trim() || '0, 194, 255';
                    
                    ctx.lineCap = 'round';
                    ctx.shadowBlur = 30;
                    ctx.shadowColor = `rgba(${ambientColor}, 1)`;
                    
                    // Draw 3 layers of waves for a glowing/dynamic effect
                    for (let w = 0; w < 3; w++) {
                        ctx.beginPath();
                        const sliceWidth = canvas.width * 1.0 / analyser.frequencyBinCount;
                        let x = 0;
                        
                        for(let i = 0; i < analyser.frequencyBinCount; i++) {
                            const v = timeDataArray[i] / 128.0; // 0.0 to 2.0 (1.0 is center)
                            const multiplier = 1 + (w * 0.8);
                            const yOffset = (v - 1) * multiplier * (canvas.height / 3);
                            
                            // Añadimos una suave curva sinusoidal para movimiento general extra
                            const extraWave = Math.sin(Date.now() / 1000 + i * 0.01 + w) * 20;
                            const y = canvas.height / 2 + yOffset + extraWave;
                            
                            if (i === 0) {
                                ctx.moveTo(x, y);
                            } else {
                                ctx.lineTo(x, y);
                            }
                            x += sliceWidth;
                        }
                        
                        ctx.lineWidth = 4 - w;
                        ctx.strokeStyle = `rgba(${ambientColor}, ${0.8 - w * 0.2})`;
                        ctx.stroke();
                    }
                }
            } else if (!isPlaying && bg) {
                // Return to default static appearance
                bg.style.transition = 'transform 0.5s ease-out, filter 0.5s ease-out';
                bg.style.transform = 'scale(1.3)';
                bg.style.filter = 'blur(60px) brightness(0.3) saturate(1.5)';
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
        
        draw();
    }
    
    let syncLyricsState = {
        isRunning: false,
        text: 'Preparando...',
        count: '0 / 0',
        percent: 0,
        btnHtml: '<i class="fa-solid fa-music"></i> Descargar Letras',
        btnDisabled: false
    };
    
    // DOM Elements
    const views = {
        dashboard: document.getElementById('view-dashboard'),
        category: document.getElementById('view-category'),
        admin: document.getElementById('view-admin'),
        artists: document.getElementById('view-artists'),
        albums: document.getElementById('view-albums'),
        songs: document.getElementById('view-songs'),
        genres: document.getElementById('view-genres')
    };
    const libraryGrid = document.getElementById('library-grid');
    const categoryTitle = document.getElementById('category-title');
    
    const queuePanel = document.getElementById('queue-panel');
    const queueList = document.getElementById('queue-list');
    
    const audioPlayer = document.getElementById('audio-player');
    const videoPlayer = document.getElementById('video-player');
    const fullscreenOverlay = document.getElementById('fullscreen-overlay');
    
    // Player UI
    const playBtn = document.getElementById('main-play-btn');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const playerCover = document.getElementById('player-cover');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progress-bar');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    const volumeBar = document.getElementById('volume-bar');
    const volumeProgress = document.getElementById('volume-progress');
    const fsTitle = document.getElementById('fs-title');
    const fsArtist = document.getElementById('fs-artist');
    
    // Search UI
    const searchInput = document.getElementById('global-search');
    const searchResults = document.getElementById('search-results');

    // Initialization
    function init() {
        autoAdjustZoom();
        loadInitialSettings();
        fetchMedia();
        setupEventListeners();
        
        // Initial route handling
        if (typeof INITIAL_VIEW !== 'undefined' && INITIAL_VIEW !== 'index' && INITIAL_VIEW !== 'dashboard') {
            navigate(INITIAL_VIEW, false);
        }
    }

    function loadInitialSettings() {
        fetch('api/settings.php')
            .then(res => res.json())
            .then(data => {
                if(data.volume !== undefined) {
                    audioPlayer.volume = data.volume;
                    videoPlayer.volume = data.volume;
                    volumeProgress.style.width = `${data.volume * 100}%`;
                }
            })
            .catch(err => console.error("Error loading settings:", err));
    }

    function fetchMedia() {
        fetch('api/get_media.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    mediaData = data.data;
                    renderRecent();
                    renderNewest();
                    renderTopTracks();
                }
            })
            .catch(err => console.error("Error loading media:", err));
    }

    function setupEventListeners() {
        window.addEventListener('resize', autoAdjustZoom);
        
        // Drag to scroll for horizontal containers (modern behavior)
        const scrollContainers = document.querySelectorAll('.horizontal-scroll-container');
        scrollContainers.forEach(slider => {
            let isDown = false;
            let startX;
            let scrollLeft;
            let isDragging = false;

            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                slider.style.scrollBehavior = 'auto'; // Disable smooth scroll while dragging
                startX = e.pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
                isDragging = false;
            });
            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.style.scrollBehavior = 'smooth';
            });
            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.style.scrollBehavior = 'smooth';
            });
            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX) * 2; // Scroll speed
                if (Math.abs(x - startX) > 5) isDragging = true; // threshold to differentiate click from drag
                slider.scrollLeft = scrollLeft - walk;
            });
            
            // Prevent clicks if user was dragging
            slider.addEventListener('click', (e) => {
                if(isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);
        });

        // Drag to scroll for vertical containers (Tops, Main Content, etc.)
        const verticalContainers = document.querySelectorAll('#top-container, .content-area');
        verticalContainers.forEach(slider => {
            let isDown = false;
            let startY;
            let scrollTop;
            let isDragging = false;

            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                slider.style.scrollBehavior = 'auto';
                startY = e.pageY - slider.offsetTop;
                scrollTop = slider.scrollTop;
                isDragging = false;
            });
            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.style.scrollBehavior = 'smooth';
            });
            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.style.scrollBehavior = 'smooth';
            });
            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const y = e.pageY - slider.offsetTop;
                const walk = (y - startY) * 2;
                if (Math.abs(y - startY) > 5) isDragging = true;
                slider.scrollTop = scrollTop - walk;
            });
            
            slider.addEventListener('click', (e) => {
                if(isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);
        });

        // Progress and Volume Draggable
        makeDraggable(progressBar, (percent) => {
            if(currentIndex === -1) return;
            const player = queue[currentIndex].type === 'music' ? audioPlayer : videoPlayer;
            if (player && !isNaN(player.duration)) {
                player.currentTime = percent * player.duration;
            }
        });
        
        makeDraggable(volumeBar, (percent) => {
            audioPlayer.volume = percent;
            videoPlayer.volume = percent;
            
            // Unmute if sliding volume up
            if (percent > 0 && audioPlayer.muted) {
                app.toggleMute();
            }
        });
        
        // Media events
        audioPlayer.addEventListener('loadedmetadata', () => { if(typeof app.syncStateToRemote === 'function') app.syncStateToRemote(); });
        videoPlayer.addEventListener('loadedmetadata', () => { if(typeof app.syncStateToRemote === 'function') app.syncStateToRemote(); });
        audioPlayer.addEventListener('timeupdate', updateProgress);
        videoPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', next);
        videoPlayer.addEventListener('ended', next);
        audioPlayer.addEventListener('volumechange', syncVolumeUI);
        videoPlayer.addEventListener('volumechange', syncVolumeUI);
        
        // Search
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('focus', showKeyboard);
        
        document.addEventListener('click', (e) => {
            if(!e.target.closest('.search-container')) {
                searchResults.classList.add('hidden');
            }
            
            if (keyboardContainer && !keyboardContainer.classList.contains('vk-hidden') && 
                !keyboardContainer.contains(e.target) && e.target !== searchInput && !e.target.closest('.vk-key')) {
                hideKeyboard();
            }
        });
    }

    function autoAdjustZoom() {
        // La interfaz fue diseñada con una base de 1920x1080 aprox
        const baseWidth = 1920;
        const baseHeight = 1080;
        
        // Calculamos la proporción necesaria para que quepa todo
        const scaleW = window.innerWidth / baseWidth;
        const scaleH = window.innerHeight / baseHeight;
        
        // Tomamos la menor proporción para asegurar que nada se solape
        const scale = Math.min(scaleW, scaleH);
        
        // Limitamos el zoom para que no sea ni microscópico ni gigante
        const finalZoom = Math.max(0.4, Math.min(scale, 1.2));
        
        document.body.style.zoom = finalZoom;
        
        // Actualizamos el slider del panel de admin si existe para reflejar el auto-zoom
        const zoomInput = document.getElementById('admin-zoom-default');
        if (zoomInput) {
            zoomInput.value = finalZoom.toFixed(1);
            const zoomVal = document.getElementById('zoom-val');
            if(zoomVal) zoomVal.textContent = finalZoom.toFixed(1) + 'x';
        }
    }

    // Navigation
    let currentApiTipo = 'musica';
    let currentCategoryViewName = 'music';
    let currentGenero = '';

    function navigate(viewName, pushState = true) {
        Object.values(views).forEach(v => {
            if(v) v.classList.remove('active');
        });
        
        // Hide full-screen overlays when navigating menus
        const musicViz = document.getElementById('music-visualizer');
        if (musicViz) musicViz.classList.add('hidden');
        
        if (viewName === 'dashboard') {
            views.dashboard.classList.add('active');
        } else if (viewName === 'admin') {
            views.admin.classList.add('active');
            initAdmin();
            const urlParams = new URLSearchParams(window.location.search);
            const tabParam = urlParams.get('tab');
            if (tabParam) {
                setTimeout(() => {
                    const tabBtn = document.querySelector(`.admin-tab-btn[data-tab="${tabParam}"]`);
                    if (tabBtn) tabBtn.click();
                }, 100);
            }
        } else if (viewName === 'genres') {
            views.genres.classList.add('active');
            loadGenres();
        } else if (viewName === 'music' || viewName === 'karaoke' || viewName === 'videos' || viewName === 'artists') {
            if(views.artists) views.artists.classList.add('active');
            
            // Map viewName to API 'tipo' and human-readable titles
            let viewTitle = 'Música';
            if (viewName !== 'artists') {
                currentGenero = null; // Clear genre filter when clicking main categories
                currentCategoryViewName = viewName;
                if (viewName === 'karaoke') {
                    currentApiTipo = 'karaoke';
                    viewTitle = 'Karaoke';
                } else if (viewName === 'videos') {
                    currentApiTipo = 'video';
                    viewTitle = 'Videos Musicales';
                } else {
                    currentApiTipo = 'musica';
                    viewTitle = 'Música';
                }
            } else {
                // If viewName is just 'artists' (e.g. going back), restore the title from the current state
                if (currentApiTipo === 'karaoke') viewTitle = 'Karaoke';
                else if (currentApiTipo === 'video') viewTitle = 'Videos Musicales';
                else viewTitle = 'Música';
            }
            
            if (currentGenero) viewTitle += ` (${currentGenero})`;

            // Update the title in the UI for the artists view
            const categoryTitle = document.getElementById('artists-view-title');
            if (categoryTitle) categoryTitle.textContent = viewTitle;
            
            loadArtists(currentApiTipo);
        } else if (viewName === 'albums') {
            if(views.albums) views.albums.classList.add('active');
        } else if (viewName === 'songs') {
            if(views.songs) views.songs.classList.add('active');
        }
        
        // Push state for dynamic URL without reload
        if (pushState) {
            let url = viewName;
            if (url === 'dashboard') url = 'index';
            if (url === 'music') url = 'musica';
            // Use query parameter instead of fake .php file to prevent 404 on refresh
            history.pushState({view: viewName}, '', '?view=' + url);
        }
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.view) {
            navigate(e.state.view, false);
        } else {
            // Default or physical page load state
            if (typeof INITIAL_VIEW !== 'undefined' && INITIAL_VIEW !== 'index') {
                navigate(INITIAL_VIEW, false);
            } else {
                navigate('dashboard', false);
            }
        }
    });

    function renderCategory(category) {
        const titles = { music: 'Música', karaoke: 'Karaoke', videos: 'Videos Musicales' };
        const icons = { music: 'fa-music', karaoke: 'fa-microphone', videos: 'fa-film' };
        
        categoryTitle.textContent = titles[category];
        libraryGrid.innerHTML = '';
        
        const items = mediaData[category] || [];
        
        if(items.length === 0) {
            libraryGrid.innerHTML = '<p style="color:var(--text-secondary)">No hay elementos en esta categoría.</p>';
            return;
        }

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'media-item';
            
            const hasCover = item.portada && !item.portada.includes('ui-avatars');
            const coverHtml = hasCover ? 
                `<img src="${item.portada}" style="width:100%;height:100%;object-fit:cover;">` : 
                `<i class="fa-solid ${icons[category]}"></i>`;
                
            el.innerHTML = `
                <div class="media-cover">${coverHtml}</div>
                <div class="media-title">${item.name}</div>
                <div class="media-subtitle">${item.artista || 'Rockola App'}</div>
            `;
            el.onclick = () => playItem(item);
            libraryGrid.appendChild(el);
        });
    }

    function renderRecent() {
        const recentContainer = document.getElementById('recent-container');
        if(!recentContainer) return;
        
        recentContainer.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">Cargando...</p>';
        
        fetch('api/recomendados.php')
            .then(res => res.json())
            .then(data => {
                recentContainer.innerHTML = '';
                if(data.status === 'success' && data.data.length > 0) {
                    data.data.forEach(item => {
                        const el = document.createElement('div');
                        el.className = 'media-item';
                        el.style.width = '160px';
                        el.style.flex = '0 0 160px';
                        el.style.scrollSnapAlign = 'start';
                        const icons = { music: 'fa-music', karaoke: 'fa-microphone', videos: 'fa-film' };
                        
                        const hasCover = item.portada && !item.portada.includes('ui-avatars');
                        const coverHtml = hasCover ? 
                            `<img src="${item.portada}" style="width:100%;height:100%;object-fit:cover;">` : 
                            `<i class="fa-solid ${icons[item.type]}"></i>`;
                        
                        el.innerHTML = `
                            <div class="media-cover">
                                ${coverHtml}
                            </div>
                            <div class="media-title">${item.name}</div>
                            <div class="media-subtitle" style="text-transform:capitalize;">${item.artista || item.type}</div>
                        `;
                        el.onclick = () => playItem(item);
                        recentContainer.appendChild(el);
                    });
                } else {
                    recentContainer.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">No hay recomendaciones aún.</p>';
                }
            })
            .catch(err => {
                recentContainer.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">Error al cargar.</p>';
            });
    }

    function renderNewest() {
        const newestContainer = document.getElementById('newest-container');
        if(!newestContainer) return;
        
        newestContainer.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">Cargando...</p>';
        
        fetch(`api/recientes.php?tipo=${currentApiTipo}`)
            .then(res => res.json())
            .then(data => {
                newestContainer.innerHTML = '';
                if(data.status === 'success' && data.data.length > 0) {
                    data.data.forEach(artist => {
                        const el = document.createElement('div');
                        el.className = 'artist-card';
                        el.style.width = '160px';
                        el.style.flex = '0 0 160px';
                        el.style.scrollSnapAlign = 'start';
                        el.setAttribute('data-name', artist.nombre);
                        
                        el.innerHTML = `
                            <img src="${artist.imagen}" class="artist-img" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover;" alt="${artist.nombre}">
                            <div class="artist-name-tag" style="margin-top: 10px; font-weight: bold;">${artist.nombre}</div>
                            <div class="artist-stats" style="font-size: 0.8rem; color: var(--text-secondary);">${artist.cantidad_albumes} álbumes</div>
                        `;
                        el.onclick = () => loadAlbums(artist);
                        newestContainer.appendChild(el);
                    });
                } else {
                    newestContainer.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">No hay artistas recientes aún.</p>';
                }
            })
            .catch(err => {
                newestContainer.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">Error al cargar.</p>';
            });
    }

    function renderTopTracks() {
        const topContainer = document.getElementById('top-container');
        const topTitle = document.getElementById('top-title');
        if(!topContainer || !topTitle) return;
        
        topContainer.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">Cargando top...</p>';
        
        fetch('api/top.php?limit=20')
            .then(res => res.json())
            .then(data => {
                topContainer.innerHTML = '';
                if(data.status === 'success' && data.data.length > 0) {
                    topTitle.style.display = 'flex'; // Show title if there are tracks
                    data.data.forEach((item, index) => {
                        const el = document.createElement('div');
                        el.style.display = 'flex';
                        el.style.alignItems = 'center';
                        el.style.gap = '15px';
                        el.style.background = 'var(--bg-panel)';
                        el.style.padding = '10px';
                        el.style.borderRadius = '8px';
                        el.style.cursor = 'pointer';
                        el.style.transition = 'background 0.2s';
                        
                        el.onmouseover = () => el.style.background = 'var(--bg-hover)';
                        el.onmouseout = () => el.style.background = 'var(--bg-panel)';
                        
                        const hasCover = item.portada && !item.portada.includes('ui-avatars');
                        const coverHtml = hasCover ? 
                            `<img src="${item.portada}" style="width:100%;height:100%;object-fit:cover;">` : 
                            `<i class="fa-solid fa-music"></i>`;
                        
                        el.innerHTML = `
                            <div style="font-weight: 800; color: var(--text-secondary); width: 20px; text-align: center;">${index + 1}</div>
                            <div style="width: 50px; height: 50px; border-radius: 5px; background: #333; overflow: hidden; flex-shrink: 0; display:flex; justify-content:center; align-items:center; font-size:1.5rem; color:var(--bg-main);">
                                ${coverHtml}
                            </div>
                            <div style="flex: 1; overflow: hidden;">
                                <div style="font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform:capitalize;">${item.artista || item.tipo}</div>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--accent); white-space: nowrap;">
                                <i class="fa-solid fa-play" style="font-size: 0.7rem;"></i> ${item.reproducciones}
                            </div>
                        `;
                        el.onclick = () => playItem(item);
                        topContainer.appendChild(el);
                    });
                } else {
                    topTitle.style.display = 'none'; // Hide if no top tracks
                }
            })
            .catch(err => {
                topContainer.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">Error al cargar.</p>';
            });
    }


    // Music/Media Flow Logic
    function loadArtists(apiTipo = 'musica') {
        const grid = document.getElementById('artists-grid');
        grid.innerHTML = '<p style="color:var(--text-secondary); padding:20px;">Cargando artistas/creadores...</p>';
        let url = `api/artistas.php?tipo=${apiTipo}`;
        if (currentGenero) url += `&genero=${encodeURIComponent(currentGenero)}`;
        
        fetch(url).then(res=>res.json()).then(data => {
            grid.innerHTML = '';
            if(data.status==='success' && data.data.length > 0) {
                const searchInput = document.getElementById('artist-search');
                searchInput.oninput = (e) => {
                    const q = e.target.value.toLowerCase();
                    Array.from(grid.children).forEach(card => {
                        const name = card.getAttribute('data-name').toLowerCase();
                        card.style.display = name.includes(q) ? 'flex' : 'none';
                    });
                };
                
                data.data.forEach(artist => {
                    const el = document.createElement('div');
                    el.className = 'artist-card';
                    el.setAttribute('data-name', artist.nombre);
                    el.innerHTML = `
                        <img src="${artist.imagen}" class="artist-img" alt="${artist.nombre}">
                        <div class="artist-name-tag">${artist.nombre}</div>
                        <div class="artist-stats">${artist.cantidad_albumes} álbumes/colecciones • ${artist.cantidad_canciones} pistas</div>
                    `;
                    el.onclick = () => loadAlbums(artist);
                    grid.appendChild(el);
                });
            } else {
                grid.innerHTML = '<p style="color:var(--text-secondary); padding:20px;">No hay contenido en esta categoría.</p>';
            }
        });
    }

    function loadAlbums(artist) {
        navigate('albums');
        document.getElementById('artist-header').innerHTML = `
            <img src="${artist.imagen}" style="width:150px; height:150px; border-radius:50%; object-fit:cover; box-shadow:0 10px 20px rgba(0,0,0,0.5);">
            <div>
                <h1 style="font-size:3.5rem; margin:0; line-height:1;">${artist.nombre}</h1>
                <p style="color:var(--text-secondary); font-size:1.2rem; margin-top:10px;">${artist.cantidad_albumes} álbumes • ${artist.cantidad_canciones} canciones</p>
                <button class="hero-btn" style="margin-top:20px;" onclick="app.playAllArtist(${artist.id})"><i class="fa-solid fa-play"></i> Reproducir Todo</button>
            </div>
        `;
        
        const grid = document.getElementById('albums-grid');
        grid.innerHTML = '<p style="color:var(--text-secondary);">Cargando álbumes/colecciones...</p>';
        let url = `api/albumes.php?artista_id=${artist.id}&tipo=${currentApiTipo}`;
        if (currentGenero) url += `&genero=${encodeURIComponent(currentGenero)}`;
        
        fetch(url).then(res=>res.json()).then(data => {
            grid.innerHTML = '';
            if(data.status==='success') {
                data.data.forEach(album => {
                    const el = document.createElement('div');
                    el.className = 'album-card';
                    el.innerHTML = `
                        <div style="position:relative;">
                            <img src="${album.portada}" class="album-cover" alt="${album.nombre}">
                            <div style="position:absolute; bottom:15px; right:15px; display:flex; gap:10px;">
                                <button class="hero-btn album-add-btn" style="width:45px; height:45px; border-radius:50%; padding:0; display:flex; justify-content:center; align-items:center; box-shadow: 0 5px 15px rgba(0,0,0,0.5); background: rgba(255,255,255,0.15);" onclick="event.stopPropagation(); app.addAllAlbumToQueue(${album.id}, ${artist.id})" title="Añadir Colección a la Cola">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                                <button class="hero-btn album-play-btn" style="width:45px; height:45px; border-radius:50%; padding:0; display:flex; justify-content:center; align-items:center; box-shadow: 0 5px 15px rgba(0,0,0,0.5);" onclick="event.stopPropagation(); app.playAllAlbum(${album.id}, ${artist.id})" title="Reproducir Colección Completa">
                                    <i class="fa-solid fa-play"></i>
                                </button>
                            </div>
                        </div>
                        <div class="album-title">${album.nombre}</div>
                        <div class="artist-stats">${album.anio ? album.anio + ' • ' : ''}${album.cantidad_canciones} canciones</div>
                    `;
                    el.onclick = () => loadSongs(album, artist);
                    grid.appendChild(el);
                });
            }
        }).catch(err => {
            grid.innerHTML = `<p style="color:#ff5555;">Error: ${err.message}</p>`;
            console.error(err);
        });
    }

    function addAllAlbumToQueue(albumId, artistId) {
        let url = `api/canciones.php?album_id=${albumId}&artista_id=${artistId}&tipo=${currentApiTipo}`;
        if (currentGenero) url += `&genero=${encodeURIComponent(currentGenero)}`;
        fetch(url).then(res=>res.json()).then(data => {
            if(data.status==='success' && data.data.length > 0) {
                data.data.forEach(song => queue.push(song));
                if(currentIndex === -1) {
                    currentIndex = 0;
                    loadMedia(queue[0]);
                }
                renderQueue();
                
                const toast = document.createElement('div');
                toast.style.position = 'fixed';
                toast.style.bottom = '100px';
                toast.style.left = '50%';
                toast.style.transform = 'translateX(-50%)';
                toast.style.background = 'var(--accent)';
                toast.style.color = '#000';
                toast.style.padding = '15px 30px';
                toast.style.borderRadius = '30px';
                toast.style.fontWeight = '800';
                toast.style.zIndex = '9999';
                toast.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
                toast.innerHTML = `<i class="fa-solid fa-check"></i> Disco añadido a la cola`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            }
        });
    }

    function playAllAlbum(albumId, artistId) {
        let url = `api/canciones.php?album_id=${albumId}&artista_id=${artistId}&tipo=${currentApiTipo}`;
        if (currentGenero) url += `&genero=${encodeURIComponent(currentGenero)}`;
        fetch(url).then(res=>res.json()).then(data => {
            if(data.status==='success' && data.data.length > 0) {
                queue = data.data;
                currentIndex = 0;
                loadMedia(queue[0]);
                renderQueue();
                if(!isPlaying) togglePlay();
            }
        });
    }

    function loadSongs(album, artist) {
        navigate('songs');
        document.getElementById('album-header').innerHTML = `
            <img src="${album.portada}" style="width:250px; height:250px; border-radius:15px; object-fit:cover; box-shadow:0 15px 30px rgba(0,0,0,0.6);">
            <div>
                <h2 style="font-size:1.2rem; color:var(--text-secondary); margin-bottom:5px;">Álbum</h2>
                <h1 style="font-size:4rem; margin:0; line-height:1.1; margin-bottom:10px;">${album.nombre}</h1>
                <p style="font-size:1.1rem; color:rgba(255,255,255,0.8); display:flex; align-items:center; gap:10px;">
                    <img src="${artist.imagen}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;"> 
                    <strong>${artist.nombre}</strong> • ${album.anio ? album.anio + ' • ' : ''}${album.cantidad_canciones} pistas
                </p>
            </div>
        `;

        const backBtn = document.getElementById('btn-back-to-albums');
        backBtn.onclick = () => loadAlbums(artist);

        const list = document.getElementById('songs-list');
        list.innerHTML = '<p style="color:var(--text-secondary);">Cargando canciones...</p>';
        
        let url = `api/canciones.php?album_id=${album.id}&artista_id=${artist.id}&tipo=${currentApiTipo}`;
        if (currentGenero) url += `&genero=${encodeURIComponent(currentGenero)}`;
        
        fetch(url).then(res=>res.json()).then(data => {
            list.innerHTML = '';
            if(data.status==='success') {
                data.data.forEach((song, index) => {
                    const el = document.createElement('div');
                    el.className = 'song-row';
                    el.innerHTML = `
                        <div class="song-num">${index + 1}</div>
                        <div class="song-details">
                            <div class="song-title">${song.name}</div>
                            <div class="song-duration">${formatTime(song.duracion)}</div>
                        </div>
                        <div class="song-actions">
                            <button class="song-btn btn-play-now" onclick="app.playNow(event, '${encodeURIComponent(JSON.stringify(song)).replace(/'/g, "%27")}')"><i class="fa-solid fa-play"></i></button>
                            <button class="song-btn btn-add-queue" onclick="app.addToQueue(event, '${encodeURIComponent(JSON.stringify(song)).replace(/'/g, "%27")}')"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    `;
                    el.onclick = () => app.playNow(null, encodeURIComponent(JSON.stringify(song)));
                    list.appendChild(el);
                });
            }
        });
    }

    function loadGenres() {
        const grid = document.getElementById('genres-grid');
        grid.innerHTML = '<p style="color:var(--text-secondary); padding:20px;">Cargando estilos musicales...</p>';
        fetch('api/generos.php').then(res=>res.json()).then(data => {
            grid.innerHTML = '';
            if(data.status === 'success' && data.data.length > 0) {
                const searchInput = document.getElementById('genre-search');
                searchInput.oninput = (e) => {
                    const q = e.target.value.toLowerCase();
                    Array.from(grid.children).forEach(card => {
                        const name = card.getAttribute('data-name').toLowerCase();
                        card.style.display = name.includes(q) ? 'flex' : 'none';
                    });
                };
                
                data.data.forEach(genre => {
                    const el = document.createElement('div');
                    el.className = 'artist-card';
                    el.setAttribute('data-name', genre.nombre);
                    el.innerHTML = `
                        <img src="${genre.imagen}" class="artist-img" style="border-radius:15px; width:100%; height:160px; object-fit:cover;" alt="${genre.nombre}">
                        <div class="artist-name-tag" style="text-transform:capitalize; margin-top:10px;">${genre.nombre}</div>
                        <div class="artist-stats">${genre.cantidad_canciones} pistas</div>
                    `;
                    el.onclick = () => {
                        currentGenero = genre.nombre;
                        navigate('artists');
                    };
                    grid.appendChild(el);
                });
            } else {
                grid.innerHTML = '<p style="color:var(--text-secondary); padding:20px;">No se encontraron géneros musicales.</p>';
            }
        });
    }

    function goToArtist(artistIdOrName) {
        fetch(`api/artistas.php?tipo=${currentApiTipo}`).then(res=>res.json()).then(data => {
            if(data.status === 'success') {
                const artist = data.data.find(a => a.id == artistIdOrName || a.nombre.toLowerCase() === String(artistIdOrName).toLowerCase());
                if(artist) {
                    loadAlbums(artist);
                } else {
                    alert('Artista/Creador no encontrado en esta categoría.');
                }
            }
        });
    }

    function goToAlbum(albumIdOrName, artistIdOrName) {
        fetch(`api/artistas.php?tipo=${currentApiTipo}`).then(res=>res.json()).then(data => {
            if(data.status === 'success') {
                const artist = data.data.find(a => a.id == artistIdOrName || a.nombre.toLowerCase() === String(artistIdOrName).toLowerCase());
                if(artist) {
                    fetch(`api/albumes.php?artista_id=${artist.id}&tipo=${currentApiTipo}`).then(res=>res.json()).then(d2 => {
                        if(d2.status === 'success') {
                            const album = d2.data.find(al => al.id == albumIdOrName || al.nombre.toLowerCase() === String(albumIdOrName).toLowerCase());
                            if(album) {
                                loadSongs(album, artist);
                            } else {
                                alert('Álbum/Colección no encontrado.');
                            }
                        }
                    });
                } else {
                    alert('Artista/Creador no encontrado.');
                }
            }
        });
    }

    function playNow(e, encodedSong) {
        if(e) e.stopPropagation();
        const song = JSON.parse(decodeURIComponent(encodedSong));
        queue = [song];
        currentIndex = 0;
        loadMedia(song);
        renderQueue();
    }

    function addToQueue(e, encodedSong) {
        if(e) e.stopPropagation();
        const song = JSON.parse(decodeURIComponent(encodedSong));
        queue.push(song);
        if(currentIndex === -1) {
            currentIndex = 0;
            loadMedia(song);
        }
        renderQueue();
        
        // Mostrar notificación de agregado
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '100px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'var(--accent)';
        toast.style.color = '#000';
        toast.style.padding = '15px 30px';
        toast.style.borderRadius = '30px';
        toast.style.fontWeight = '800';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
        toast.innerHTML = `<i class="fa-solid fa-check"></i> Agregada a la cola`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    function playAllArtist(artistId) {
        fetch(`api/canciones.php?artista_id=${artistId}&tipo=${currentApiTipo}`).then(res=>res.json()).then(data => {
            if(data.status==='success' && data.data.length > 0) {
                queue = data.data;
                currentIndex = 0;
                loadMedia(queue[0]);
                renderQueue();
                if(!isPlaying) togglePlay();
            }
        });
    }

    // Search Logic
    function handleSearch(e) {
        const query = e.target.value.toLowerCase();
        if(query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }
        
        const results = [];
        Object.keys(mediaData).forEach(cat => {
            mediaData[cat].forEach(item => {
                if(item.name.toLowerCase().includes(query)) {
                    results.push(item);
                }
            });
        });
        
        renderSearchResults(results);
    }

    function renderSearchResults(results) {
        searchResults.innerHTML = '';
        if(results.length === 0) {
            searchResults.innerHTML = '<div style="padding:15px;color:#a0a0a0;">No se encontraron resultados</div>';
        } else {
            const icons = { music: 'fa-music', karaoke: 'fa-microphone', videos: 'fa-film' };
            results.slice(0, 8).forEach(item => {
                const el = document.createElement('div');
                el.className = 'search-item';
                el.innerHTML = `
                    <i class="fa-solid ${icons[item.type]}"></i>
                    <div class="details">
                        <span>${item.name}</span>
                        <span>${item.type}</span>
                    </div>
                `;
                el.onclick = () => {
                    playItem(item);
                    searchResults.classList.add('hidden');
                    searchInput.value = '';
                };
                searchResults.appendChild(el);
            });
        }
        searchResults.classList.remove('hidden');
    }

    // Playback Logic
    function syncStateToRemote() {
        if(currentIndex === -1) return;
        const currentItem = queue[currentIndex];
        const player = currentItem.type === 'music' ? audioPlayer : videoPlayer;
        const formData = new FormData();
        formData.append('item', JSON.stringify(currentItem));
        formData.append('isPlaying', isPlaying ? 'true' : 'false');
        formData.append('currentTime', player ? player.currentTime : 0);
        formData.append('duration', player && !isNaN(player.duration) ? player.duration : 0);
        formData.append('isShuffle', isShuffle ? 'true' : 'false');
        formData.append('repeatMode', repeatMode);
        
        fetch('api/state.php?action=push', { method: 'POST', body: formData }).catch(e=>console.log(e));
    }

    function getAverageRGB(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = img.width || 1;
                canvas.height = img.height || 1;
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let i = 0, len = data.length; i < len; i += 16) {
                        r += data[i];
                        g += data[i+1];
                        b += data[i+2];
                        count++;
                    }
                    resolve({ r: Math.floor(r/count), g: Math.floor(g/count), b: Math.floor(b/count) });
                } catch(e) {
                    reject(e);
                }
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    function playItem(item) {
        queue = [item];
        currentIndex = 0;
        loadMedia(item);
        renderQueue();
    }
    
    function loadMedia(item) {
        initAudioVisualizer(); // Iniciar visualizador con la interacción del usuario
        
        playerTitle.textContent = item.name;
        playerArtist.textContent = item.artista || 'Rockola App';
        fsTitle.textContent = item.name;
        fsArtist.textContent = item.artista || '';
        
        // Update bottom bar cover
        const hasCover = item.portada && !item.portada.includes('ui-avatars');
        
        if (hasCover) {
            getAverageRGB(item.portada).then(rgb => {
                document.documentElement.style.setProperty('--ambient-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            }).catch(() => {
                document.documentElement.style.setProperty('--ambient-rgb', '0, 194, 255');
            });
        } else {
            document.documentElement.style.setProperty('--ambient-rgb', '0, 194, 255');
        }

        if (hasCover) {
            playerCover.innerHTML = `<img src="${item.portada}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
        } else {
            const icons = { music: 'fa-music', karaoke: 'fa-microphone', videos: 'fa-film' };
            playerCover.innerHTML = `<i class="fa-solid ${icons[item.type]}"></i>`;
        }
        
        audioPlayer.pause();
        videoPlayer.pause();

        const musicViz = document.getElementById('music-visualizer');
        
        if (item.type === 'music') {
            fullscreenOverlay.classList.add('hidden');
            
            // Show music visualizer
            musicViz.classList.remove('hidden');
            
            // Set background blur from cover
            const bg = document.getElementById('mv-background');
            if (hasCover) {
                bg.style.backgroundImage = `url('${item.portada}')`;
            } else {
                bg.style.backgroundImage = 'linear-gradient(135deg, #1a0033, #00264d)';
            }
            
            // El cambio de carátula del disco se hará en la animación
            // Set disc cover (deferred)
            
            // Set song info
            document.getElementById('mv-song').textContent = item.name;
            document.getElementById('mv-artist').textContent = item.artista || 'Artista Desconocido';
            document.getElementById('mv-album').textContent = item.album || '';
            
            // Generate Links
            const mvLinks = document.getElementById('mv-links');
            if (mvLinks) {
                mvLinks.innerHTML = '';
                if (item.artista && item.type === 'music') {
                    const btnArt = document.createElement('button');
                    btnArt.className = 'hero-btn';
                    btnArt.style.padding = '8px 15px';
                    btnArt.style.fontSize = '0.85rem';
                    btnArt.innerHTML = '<i class="fa-solid fa-user"></i> Ver Artista';
                    btnArt.onclick = () => {
                        toggleMusicVisualizer();
                        goToArtist(item.artista_id || item.artista);
                    };
                    mvLinks.appendChild(btnArt);
                }
                if (item.album && item.type === 'music') {
                    const btnAlb = document.createElement('button');
                    btnAlb.className = 'hero-btn';
                    btnAlb.style.padding = '8px 15px';
                    btnAlb.style.fontSize = '0.85rem';
                    btnAlb.style.background = 'rgba(255,255,255,0.15)';
                    btnAlb.innerHTML = '<i class="fa-solid fa-compact-disc"></i> Ver Álbum';
                    btnAlb.onclick = () => {
                        toggleMusicVisualizer();
                        goToAlbum(item.album_id || item.album, item.artista_id || item.artista);
                    };
                    mvLinks.appendChild(btnAlb);
                }
            }
            
            // Fetch Lyrics
            const lyricsContent = document.getElementById('mv-lyrics-content');
            if (lyricsContent) {
                lyricsContent.innerHTML = '<div style="color:rgba(255,255,255,0.5); font-style:italic;">Buscando letras...</div>';
                
                const fetchUrl = `api/lyrics.php?artist=${encodeURIComponent(item.artista || '')}&title=${encodeURIComponent(item.name || '')}&album=${encodeURIComponent(item.album || 'Unknown Album')}`;
                
                fetch(fetchUrl)
                    .then(response => response.json())
                    .then(data => {
                        currentSyncedLyrics = [];
                        activeLyricIndex = -1;
                        if (data.found) {
                            if (data.syncedLyrics) {
                                // Parse synced lyrics
                                const lines = data.syncedLyrics.split('\n');
                                lines.forEach(line => {
                                    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
                                    if (match) {
                                        const mins = parseInt(match[1]);
                                        const secs = parseInt(match[2]);
                                        const ms = parseInt(match[3].padEnd(3, '0'));
                                        const time = mins * 60 + secs + ms / 1000;
                                        const text = match[4].trim();
                                        if (text) currentSyncedLyrics.push({ time, text });
                                    }
                                });
                                
                                if (currentSyncedLyrics.length > 0) {
                                    lyricsContent.innerHTML = '';
                                    currentSyncedLyrics.forEach((lyric, idx) => {
                                        const p = document.createElement('p');
                                        p.id = 'lyric-line-' + idx;
                                        p.className = 'lyric-line';
                                        p.textContent = lyric.text;
                                        p.style.transition = 'color 0.3s, font-size 0.3s';
                                        p.style.fontSize = '1.8rem';
                                        p.style.color = 'rgba(255,255,255,0.4)';
                                        p.style.margin = '18px 0';
                                        p.style.cursor = 'pointer';
                                        p.onclick = () => { audioPlayer.currentTime = lyric.time; };
                                        lyricsContent.appendChild(p);
                                    });
                                    return; // done
                                }
                            }
                            // Fallback to plain lyrics
                            lyricsContent.innerHTML = `<div style="white-space: pre-wrap;">${data.plainLyrics}</div>`;
                        } else {
                            lyricsContent.innerHTML = '<div style="color:rgba(255,255,255,0.5); font-style:italic;">No se encontró la letra de esta canción.</div>';
                        }
                    })
                    .catch(err => {
                        console.error('Error fetching lyrics:', err);
                        lyricsContent.innerHTML = '<div style="color:rgba(255,255,255,0.5); font-style:italic;">Error de conexión.</div>';
                    });
            }
            
            // Secuencia de inicio mecánica completa
            const tonearm = document.getElementById('tonearm');
            const artistImg = document.getElementById('mv-artist-img');
            if (artistImg) {
                if (item.portada) {
                    artistImg.src = item.portada;
                    artistImg.style.display = 'block';
                } else if (item.artista_imagen) {
                    artistImg.src = item.artista_imagen;
                    artistImg.style.display = 'block';
                } else {
                    artistImg.style.display = 'none';
                }
            }

            const discContainer = document.getElementById('mv-disc-container');
            
            if(tonearm) {
                tonearm.style.transform = ''; // Mover a reposo primero
            }
            setDiscSpeed(0); // Detener el disco inmediatamente
            
            audioPlayer.src = item.url;
            
            clearTimeout(playSequenceTimeout);
            
            // 1. Deslizar disco viejo hacia afuera
            if (discContainer) {
                discContainer.classList.remove('slide-in');
                discContainer.classList.add('slide-out');
            }
            
            // 2. Esperar a que el brazo regrese y el disco salga (500ms)
            playSequenceTimeout = setTimeout(() => {
                if (queue[currentIndex] && queue[currentIndex].url === item.url && isPlaying) {
                    
                    // 3. Cambiar la carátula del disco mientras está oculto
                    const discCover = document.getElementById('mv-disc-cover');
                    if (discCover) {
                        discCover.innerHTML = hasCover ? `<img src="${item.portada}">` : '<i class="fa-solid fa-music"></i>';
                    }
                    
                    // 4. Deslizar el nuevo disco hacia adentro
                    if (discContainer) {
                        discContainer.classList.remove('slide-out');
                        discContainer.classList.add('slide-in');
                    }
                    
                    // 5. Esperar que el disco entre (500ms)
                    setTimeout(() => {
                        if (isPlaying && queue[currentIndex] && queue[currentIndex].url === item.url) {
                            if (tonearm) tonearm.style.transform = `rotate(18deg)`; 
                            
                            // 6. Esperar a que el brazo llegue al disco (800ms)
                            setTimeout(() => {
                                if (isPlaying && queue[currentIndex] && queue[currentIndex].url === item.url) {
                                    setDiscSpeed(1);
                                    audioPlayer.play().catch(e => console.log('Autoplay blocked:', e));
                                }
                            }, 800);
                        }
                    }, 500);
                }
            }, 500);
            
            isFullscreen = false;
        } else {
            // Karaoke or Video
            musicViz.classList.add('hidden');
            audioPlayer.src = '';
            
            // Reset mini container if video was minimized
            const miniContainer = document.getElementById('mini-video-container');
            if (miniContainer) {
                miniContainer.classList.add('hidden');
                miniContainer.innerHTML = '';
                document.getElementById('player-cover').style.display = '';
            }
            
            // Ensure video element is inside fullscreen overlay
            const videoInfoOverlay = fullscreenOverlay.querySelector('.video-info-overlay');
            if (videoPlayer.parentElement !== fullscreenOverlay) {
                fullscreenOverlay.insertBefore(videoPlayer, videoInfoOverlay);
            }
            
            fullscreenOverlay.classList.remove('hidden');
            videoPlayer.src = item.url;
            videoPlayer.play();
            isFullscreen = true;
        }
        
        isPlaying = true;
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        
        // Registrar reproducción
        if (item.id) {
            fetch(`api/track_play.php?id=${item.id}`)
                .catch(err => console.error('Error tracking play:', err));
        }
        
        syncStateToRemote();
    }

    // Disc Animation with Inertia
    let discAnimation;
    let inertiaInterval;
    let playSequenceTimeout;

    function initDiscAnimation() {
        const disc = document.getElementById('mv-disc');
        if (disc && !discAnimation) {
            discAnimation = disc.animate(
                [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
                { duration: 4000, iterations: Infinity }
            );
            discAnimation.playbackRate = 0;
        }
    }

    function setDiscSpeed(targetRate) {
        if (!discAnimation) initDiscAnimation();
        clearInterval(inertiaInterval);
        inertiaInterval = setInterval(() => {
            let current = discAnimation.playbackRate;
            let diff = targetRate - current;
            if (Math.abs(diff) < 0.05) {
                discAnimation.playbackRate = targetRate;
                clearInterval(inertiaInterval);
            } else {
                discAnimation.playbackRate += diff * 0.1; // Efecto gradual (inercia)
            }
        }, 50);
    }

    function togglePlay() {
        if(currentIndex === -1) return;
        const currentItem = queue[currentIndex];
        const player = currentItem.type === 'music' ? audioPlayer : videoPlayer;
        const disc = document.getElementById('mv-disc');
        const tonearm = document.getElementById('tonearm');
        
        if(isPlaying) {
            clearTimeout(playSequenceTimeout);
            player.pause();
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            if(disc) setDiscSpeed(0);
            if(tonearm) {
                tonearm.classList.remove('playing');
                tonearm.style.transform = '';
            }
        } else {
            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            if(currentItem.type === 'music') {
                if(tonearm) {
                    const duration = player.duration || 1;
                    const currentTime = player.currentTime || 0;
                    const progressPercent = (currentTime / duration) * 100;
                    const startAngle = 18;
                    const endAngle = 40;
                    const currentAngle = startAngle + (progressPercent / 100) * (endAngle - startAngle);
                    tonearm.style.transform = `rotate(${currentAngle}deg)`;
                }
                clearTimeout(playSequenceTimeout);
                playSequenceTimeout = setTimeout(() => {
                    if(isPlaying) {
                        if(disc) setDiscSpeed(1);
                        initAudioVisualizer();
                        player.play().catch(e=>console.log(e));
                    }
                }, 800);
            } else {
                player.play();
            }
        }
        isPlaying = !isPlaying;
        syncStateToRemote();
    }

    function prev() {
        if (currentIndex > 0) {
            currentIndex--;
            loadMedia(queue[currentIndex]);
            renderQueue();
        }
    }

    function next() {
        if (currentIndex < queue.length - 1 && currentIndex !== -1) {
            currentIndex++;
            loadMedia(queue[currentIndex]);
            renderQueue();
        } else if (repeatMode === 1 && queue.length > 0) {
            currentIndex = 0;
            loadMedia(queue[currentIndex]);
            renderQueue();
        } else {
            // End of queue
            isPlaying = false;
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            if(currentIndex !== -1 && queue[currentIndex].type !== 'music') {
                fullscreenOverlay.classList.add('hidden');
            }
        }
    }

    function toggleRepeat() {
        repeatMode = (repeatMode + 1) % 3;
        const btn = document.getElementById('repeat-btn');
        if(!btn) return;
        
        if (repeatMode === 0) {
            btn.style.color = 'var(--text-secondary)';
            btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            audioPlayer.loop = false;
            videoPlayer.loop = false;
        } else if (repeatMode === 1) {
            btn.style.color = 'var(--accent)';
            btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            audioPlayer.loop = false;
            videoPlayer.loop = false;
        } else if (repeatMode === 2) {
            btn.style.color = 'var(--accent)';
            btn.innerHTML = '<i class="fa-solid fa-repeat-1"></i>';
            audioPlayer.loop = true;
            videoPlayer.loop = true;
        }
    }

    function toggleShuffle() {
        isShuffle = !isShuffle;
        const btn = document.getElementById('shuffle-btn');
        if(!btn) return;
        
        btn.style.color = isShuffle ? 'var(--accent)' : 'var(--text-secondary)';
        
        if (isShuffle && queue.length > 1) {
            originalQueue = [...queue];
            const currentItem = queue[currentIndex];
            const remaining = queue.filter((_, idx) => idx !== currentIndex);
            for (let i = remaining.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
            }
            queue = [currentItem, ...remaining];
            currentIndex = 0;
            renderQueue();
        } else if (!isShuffle && originalQueue.length > 0) {
            const currentItem = queue[currentIndex];
            queue = [...originalQueue];
            currentIndex = queue.findIndex(item => item.id === currentItem.id && item.type === currentItem.type);
            if(currentIndex === -1) currentIndex = 0;
            renderQueue();
        }
    }

    function toggleMute() {
        const icon = document.getElementById('volume-icon-element');
        if(audioPlayer.muted) {
            audioPlayer.muted = false;
            videoPlayer.muted = false;
            if(icon) icon.className = 'fa-solid fa-volume-high volume-icon';
        } else {
            audioPlayer.muted = true;
            videoPlayer.muted = true;
            if(icon) icon.className = 'fa-solid fa-volume-xmark volume-icon';
        }
    }

    function toggleQueuePanel() {
        const panel = document.getElementById('queue-panel');
        if(panel) panel.classList.toggle('hidden');
    }


    function updateProgress(e) {
        const { duration, currentTime } = e.srcElement;
        if (isNaN(duration)) return;

        const progressPercent = (currentTime / duration) * 100;
        progress.style.width = `${progressPercent}%`;

        timeCurrent.textContent = formatTime(currentTime);
        timeTotal.textContent = formatTime(duration);
        
        // Tonearm advance logic
        const tonearm = document.getElementById('tonearm');
        if (tonearm && isPlaying && currentIndex !== -1 && queue[currentIndex].type === 'music') {
            const startAngle = 18;
            const endAngle = 40;
            const currentAngle = startAngle + (progressPercent / 100) * (endAngle - startAngle);
            tonearm.style.transform = `rotate(${currentAngle}deg)`;
        }
        
        // Synced lyrics update
        if (currentSyncedLyrics.length > 0 && e.srcElement === audioPlayer) {
            let activeIdx = -1;
            for (let i = 0; i < currentSyncedLyrics.length; i++) {
                if (currentTime >= currentSyncedLyrics[i].time - 0.2) { // 200ms pre-highlight
                    activeIdx = i;
                } else {
                    break;
                }
            }
            
            if (activeIdx !== -1 && activeIdx !== activeLyricIndex) {
                if (activeLyricIndex !== -1) {
                    const prev = document.getElementById('lyric-line-' + activeLyricIndex);
                    if (prev) {
                        prev.style.color = 'rgba(255,255,255,0.4)';
                        prev.style.fontSize = '1.8rem';
                        prev.style.fontWeight = 'normal';
                        prev.style.textShadow = 'none';
                    }
                }
                
                const curr = document.getElementById('lyric-line-' + activeIdx);
                if (curr) {
                    curr.style.color = 'var(--accent)';
                    curr.style.fontSize = '2.2rem';
                    curr.style.fontWeight = 'bold';
                    curr.style.textShadow = 'none';
                    
                    // Center the active line
                    const container = document.getElementById('mv-lyrics-content');
                    if (container) {
                        container.scrollTo({
                            top: curr.offsetTop - container.offsetTop - container.clientHeight / 2 + curr.clientHeight / 2,
                            behavior: 'smooth'
                        });
                    }
                }
                activeLyricIndex = activeIdx;
            }
        }
    }

    function makeDraggable(element, callback) {
        let isDragging = false;
        
        const update = (e) => {
            const rect = element.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let percent = (clientX - rect.left) / rect.width;
            if (percent < 0) percent = 0;
            if (percent > 1) percent = 1;
            callback(percent);
        };
        
        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            update(e);
        });
        element.addEventListener('touchstart', (e) => {
            isDragging = true;
            update(e);
        }, {passive: true});
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault(); // Prevent text selection
                update(e);
            }
        });
        document.addEventListener('touchmove', (e) => {
            if (isDragging) update(e);
        }, {passive: false}); // Allow preventDefault via CSS or non-passive if needed
        
        document.addEventListener('mouseup', () => isDragging = false);
        document.addEventListener('touchend', () => isDragging = false);
    }

    function formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function syncVolumeUI() {
        // Obtenemos el volumen desde el reproductor maestro (audioPlayer)
        const vol = audioPlayer.muted ? 0 : audioPlayer.volume;
        
        // Sincronizar barra de progreso inferior (en caso de cambios remotos o mute)
        const volumeProgress = document.getElementById('volume-progress');
        if (volumeProgress) {
            volumeProgress.style.width = `${vol * 100}%`;
        }
        
        // Sincronizar perilla grande del tocadiscos
        const knob = document.getElementById('volume-knob');
        if (knob) {
            // Mapear 0 a 1 a un ángulo de -135deg a 135deg
            const angle = -135 + (vol * 270);
            knob.style.transform = `rotate(${angle}deg)`;
        }
    }

    // Queue Logic
    function toggleQueue() {
        // La cola de reproducción ahora siempre está visible, esta función se desactiva
    }

    function renderQueue() {
        queueList.innerHTML = '';
        if(queue.length === 0) {
            queueList.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;">Cola vacía</p>';
            document.querySelector('.queue-header h3').textContent = 'Cola de Reproducción';
            return;
        }
        
        document.querySelector('.queue-header h3').textContent = `Cola (${queue.length})`;
        
        queue.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = `queue-item ${index === currentIndex ? 'active' : ''}`;
            const icons = { music: 'fa-music', karaoke: 'fa-microphone', videos: 'fa-film' };
            
            const hasCover = item.portada && !item.portada.includes('ui-avatars');
            const coverHtml = hasCover 
                ? `<img src="${item.portada}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">` 
                : `<i class="fa-solid ${icons[item.type] || 'fa-music'}"></i>`;
                
            el.innerHTML = `
                <div class="qi-cover" onclick="app.playFromQueue(${index})">${coverHtml}</div>
                <div class="qi-details" onclick="app.playFromQueue(${index})">
                    <div class="qi-title">${item.name}</div>
                    <div class="qi-artist" style="text-transform:capitalize;">${item.artista ? item.artista : item.type}</div>
                </div>
                <div class="qi-actions">
                    <button class="qi-action-btn" onclick="app.moveQueueUp(${index}, event)"><i class="fa-solid fa-chevron-up"></i></button>
                    <button class="qi-action-btn" onclick="app.moveQueueDown(${index}, event)"><i class="fa-solid fa-chevron-down"></i></button>
                    <button class="qi-action-btn" style="color:#ff4444;" onclick="app.removeFromQueue(${index}, event)"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            queueList.appendChild(el);
        });
    }

    function playFromQueue(index) {
        currentIndex = index;
        loadMedia(queue[currentIndex]);
        renderQueue();
    }

    function moveQueueUp(index, e) {
        if(e) e.stopPropagation();
        if(index > 0) {
            const temp = queue[index];
            queue[index] = queue[index - 1];
            queue[index - 1] = temp;
            if(currentIndex === index) currentIndex--;
            else if(currentIndex === index - 1) currentIndex++;
            renderQueue();
        }
    }

    function moveQueueDown(index, e) {
        if(e) e.stopPropagation();
        if(index < queue.length - 1) {
            const temp = queue[index];
            queue[index] = queue[index + 1];
            queue[index + 1] = temp;
            if(currentIndex === index) currentIndex++;
            else if(currentIndex === index + 1) currentIndex--;
            renderQueue();
        }
    }

    function removeFromQueue(index, e) {
        if(e) e.stopPropagation();
        queue.splice(index, 1);
        if(currentIndex === index) {
            if(queue.length > 0) {
                if(currentIndex >= queue.length) currentIndex = queue.length - 1;
                loadMedia(queue[currentIndex]);
            } else {
                clearQueue();
            }
        } else if(currentIndex > index) {
            currentIndex--;
        }
        renderQueue();
    }

    function clearQueue() {
        queue = [];
        currentIndex = -1;
        clearTimeout(playSequenceTimeout);
        audioPlayer.pause();
        videoPlayer.pause();
        audioPlayer.src = '';
        videoPlayer.src = '';
        setDiscSpeed(0);
        playerTitle.textContent = "Selecciona contenido";
        playerArtist.textContent = "-";
        progress.style.width = '0%';
        timeCurrent.textContent = "0:00";
        timeTotal.textContent = "0:00";
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        fullscreenOverlay.classList.add('hidden');
        
        // Reset mini video container
        const miniContainer = document.getElementById('mini-video-container');
        if (miniContainer) {
            miniContainer.classList.add('hidden');
            miniContainer.innerHTML = '';
            document.getElementById('player-cover').style.display = '';
            // Move video back to overlay if it was minimized
            const videoInfoOverlay = fullscreenOverlay.querySelector('.video-info-overlay');
            if (videoPlayer.parentElement !== fullscreenOverlay) {
                fullscreenOverlay.insertBefore(videoPlayer, videoInfoOverlay);
            }
        }
        const tonearm = document.getElementById('tonearm');
        if(tonearm) {
            tonearm.classList.remove('playing');
            tonearm.style.transform = '';
        }
        
        setTimeout(() => {
            if (currentIndex === -1) {
                document.getElementById('music-visualizer').classList.add('hidden');
            }
        }, 1000);
        
        renderQueue();
    }
    
    function toggleFullscreenMode() {
        if(currentIndex === -1) return;
        const currentItem = queue[currentIndex];
        if(currentItem.type !== 'music') {
            const miniContainer = document.getElementById('mini-video-container');
            
            if (miniContainer && !miniContainer.classList.contains('hidden')) {
                // Currently minimized → restore to fullscreen
                restoreFullscreenOverlay();
                return;
            }
            
            isFullscreen = !isFullscreen;
            if(isFullscreen) {
                fullscreenOverlay.classList.remove('hidden');
            } else {
                fullscreenOverlay.classList.add('hidden');
            }
        }
    }

    function minimizeFullscreenOverlay(e) {
        if(e) e.stopPropagation();
        if(currentIndex === -1) return;
        
        const miniContainer = document.getElementById('mini-video-container');
        if (!miniContainer) return;
        
        // Move the video element into the mini container in the player bar
        miniContainer.innerHTML = '';
        miniContainer.appendChild(videoPlayer);
        miniContainer.classList.remove('hidden');
        
        // Hide the fullscreen overlay
        fullscreenOverlay.classList.add('hidden');
        isFullscreen = false;
        
        // Hide the cover art since mini video replaces it
        document.getElementById('player-cover').style.display = 'none';
    }

    function restoreFullscreenOverlay() {
        const miniContainer = document.getElementById('mini-video-container');
        if (!miniContainer) return;
        
        // Move the video element back to the fullscreen overlay
        fullscreenOverlay.insertBefore(videoPlayer, fullscreenOverlay.querySelector('.video-info-overlay'));
        
        // Show fullscreen overlay
        fullscreenOverlay.classList.remove('hidden');
        isFullscreen = true;
        
        // Hide mini container and restore cover art
        miniContainer.classList.add('hidden');
        miniContainer.innerHTML = '';
        document.getElementById('player-cover').style.display = '';
    }
    
    function toggleMusicVisualizer() {
        if(currentIndex === -1) return;
        const currentItem = queue[currentIndex];
        if(currentItem.type !== 'music') return;
        
        const musicViz = document.getElementById('music-visualizer');
        if(musicViz) {
            musicViz.classList.toggle('hidden');
        }
    }
    function calibrateTouchScreen() {
        if(confirm("Se abrirá la herramienta nativa de calibración táctil de Windows.\n\nSigue las instrucciones en pantalla tocando las cruces en las esquinas.\n\n¿Deseas continuar?")) {
            fetch('api/calibrate.php')
                .then(res => res.json())
                .then(data => {
                    if(data.status !== 'success') {
                        alert("Error: " + data.message);
                    }
                })
                .catch(err => {
                    alert("Error al intentar abrir la calibración.");
                });
        }
    }

    // Admin Functions
    function initAdmin() {
        const tabs = document.querySelectorAll('.admin-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-tab').forEach(c => c.style.display = 'none');
                tab.classList.add('active');
                const target = tab.getAttribute('data-tab');
                document.getElementById(target).style.display = 'block';
                if(target === 'admin-library') loadLibraries();
            });
        });

        fetch('api/admin_stats.php')
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    const el = document.getElementById('stat-total');
                    if (el) {
                        el.textContent = data.data.total;
                        document.getElementById('stat-music').textContent = data.data.music;
                        document.getElementById('stat-karaoke').textContent = data.data.karaoke;
                        document.getElementById('stat-videos').textContent = data.data.videos;
                    }
                }
            });
            
        fetch('api/settings.php')
            .then(res => res.json())
            .then(data => {
                if(data.volume !== undefined) {
                    const volInput = document.getElementById('admin-vol-default');
                    if (volInput) volInput.value = data.volume;
                    
                    const musicFolderInput = document.getElementById('admin-music-folder');
                    if (musicFolderInput && data.music_folder) {
                        musicFolderInput.value = data.music_folder;
                    }
                    
                    const zoomInput = document.getElementById('admin-zoom-default');
                    if (zoomInput && data.zoom !== undefined) {
                        zoomInput.value = data.zoom;
                        document.getElementById('zoom-val').textContent = data.zoom + 'x';
                    }
                }
            });
    }

    function loadLibraries() {
        const container = document.getElementById('libraries-container');
        if (!container) return;
        
        container.innerHTML = '<p style="color:var(--text-secondary);">Cargando bibliotecas...</p>';
        
        fetch('api/bibliotecas/list.php')
            .then(res => res.json())
            .then(data => {
                container.innerHTML = '';
                if(data.status === 'success') {
                    if(data.data.length === 0) {
                        container.innerHTML = '<p style="color:var(--text-secondary);">No hay bibliotecas configuradas. Agrega una para comenzar.</p>';
                        return;
                    }
                    
                    data.data.forEach(lib => {
                        const card = document.createElement('div');
                        card.style.background = 'var(--bg-main)';
                        card.style.border = '1px solid var(--border-color)';
                        card.style.borderRadius = '10px';
                        card.style.padding = '15px';
                        
                        let icon = 'fa-folder';
                        if (lib.tipo === 'musica') icon = 'fa-music';
                        if (lib.tipo === 'karaoke') icon = 'fa-microphone';
                        if (lib.tipo === 'video') icon = 'fa-film';
                        
                        card.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="width:40px; height:40px; border-radius:8px; background:var(--accent); display:flex; justify-content:center; align-items:center; font-size:1.2rem;">
                                        <i class="fa-solid ${icon}"></i>
                                    </div>
                                    <div>
                                        <h3 style="margin:0; font-size:1.1rem;">${lib.nombre}</h3>
                                        <span style="font-size:0.8rem; color:var(--text-secondary); text-transform:capitalize;">${lib.tipo}</span>
                                    </div>
                                </div>
                            </div>
                            <p style="font-size:0.8rem; color:var(--text-secondary); word-break:break-all; margin-bottom:10px;">
                                <i class="fa-solid fa-location-dot"></i> ${lib.ruta}
                            </p>
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:var(--text-secondary); border-top:1px solid var(--border-color); padding-top:10px;">
                                <span><i class="fa-solid fa-file-audio"></i> ${lib.cantidad_archivos} archivos</span>
                                <span>${lib.ultimo_escaneo ? 'Escaneado: ' + lib.ultimo_escaneo.substring(0,10) : 'Nunca'}</span>
                            </div>
                            <div style="display:flex; gap:10px; margin-top:10px;">
                                <button class="hero-btn" style="flex:1; padding:8px; font-size:0.9rem;" onclick="app.scanLibrary(${lib.id}, this)">
                                    <i class="fa-solid fa-rotate"></i> Escanear
                                </button>
                                <button class="hero-btn" style="padding:8px 12px; background:rgba(255,255,255,0.1);" onclick="app.showEditLibraryModal(${lib.id}, '${lib.nombre.replace(/'/g, "\\'")}', '${lib.tipo}', '${lib.ruta.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" title="Editar Biblioteca"><i class="fa-solid fa-pen"></i></button>
                                <button class="hero-btn" style="padding:8px 12px; background:rgba(255,68,68,0.2); color:#ff4444;" onclick="app.deleteLibrary(${lib.id}, '${lib.nombre.replace(/'/g, "\\'")}')" title="Eliminar Biblioteca"><i class="fa-solid fa-trash"></i></button>
                            </div>
                            ${lib.tipo === 'musica' ? `
                                <div class="lyrics-card-container" style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border-color);">
                                    <button class="hero-btn btn-sync-lyrics-dynamic" style="width:100%; padding:8px; background:linear-gradient(135deg, #FF0055, #FF5500);" onclick="app.syncAllLyrics(this)" ${syncLyricsState.btnDisabled ? 'disabled' : ''}>
                                        ${syncLyricsState.btnHtml}
                                    </button>
                                    <div class="sync-lyrics-wrapper" style="margin-top:15px; display:${syncLyricsState.isRunning ? 'block' : 'none'};">
                                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                            <span class="sync-lyrics-text" style="font-size:0.8rem; font-weight:bold; color:var(--text-primary);">${syncLyricsState.text}</span>
                                            <span class="sync-lyrics-count" style="font-size:0.8rem; font-weight:bold; color:#FF0055;">${syncLyricsState.count}</span>
                                        </div>
                                        <div style="width:100%; height:8px; background:var(--bg-main); border-radius:5px; overflow:hidden;">
                                            <div class="sync-lyrics-bar" style="height:100%; width:${syncLyricsState.percent}%; background:linear-gradient(135deg, #FF0055, #FF5500); transition:width 0.3s;"></div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        `;
                        container.appendChild(card);
                    });
                }
            });
    }

    function showAddLibraryModal() {
        document.getElementById('add-library-modal').classList.remove('hidden');
    }

    function closeAddLibraryModal() {
        document.getElementById('add-library-modal').classList.add('hidden');
        document.getElementById('lib-ruta-display').value = '';
        document.getElementById('lib-nombre').value = '';
    }

    function showEditLibraryModal(id, nombre, tipo, ruta) {
        document.getElementById('edit-library-modal').classList.remove('hidden');
        document.getElementById('edit-lib-id').value = id;
        document.getElementById('edit-lib-ruta-display').value = ruta;
        document.getElementById('edit-lib-nombre').value = nombre;
        document.getElementById('edit-lib-tipo').value = tipo;
        // Reiniciar la variable del explorador al abrir el modal de edición
        folderBrowserCurrentPath = ruta;
    }

    function closeEditLibraryModal() {
        document.getElementById('edit-library-modal').classList.add('hidden');
        document.getElementById('edit-lib-id').value = '';
        document.getElementById('edit-lib-ruta-display').value = '';
        document.getElementById('edit-lib-nombre').value = '';
    }

    // ---- Folder Browser ----
    let folderBrowserCurrentPath = '';

    function toggleFolderBrowser(isEdit = false) {
        const browserId = isEdit ? 'edit-folder-browser' : 'folder-browser';
        const browser = document.getElementById(browserId);
        
        if (browser.style.display === 'none') {
            browser.style.display = 'block';
            browseFolders('', isEdit); // Mostrar unidades raíz
        } else {
            browser.style.display = 'none';
        }
    }

    function browseFolders(path, isEdit = false) {
        const listId = isEdit ? 'edit-folder-list' : 'folder-list';
        const breadcrumbId = isEdit ? 'edit-folder-breadcrumb' : 'folder-breadcrumb';
        const list = document.getElementById(listId);
        const breadcrumb = document.getElementById(breadcrumbId);
        list.innerHTML = '<p style="color:var(--text-secondary); padding:10px;">Cargando...</p>';
        
        const url = path ? `api/bibliotecas/picker.php?path=${encodeURIComponent(path)}` : 'api/bibliotecas/picker.php';
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    folderBrowserCurrentPath = data.current;
                    
                    // Breadcrumb
                    breadcrumb.innerHTML = '';
                    if (data.current) {
                        const homeBtn = document.createElement('span');
                        homeBtn.innerHTML = '<i class="fa-solid fa-hard-drive"></i>';
                        homeBtn.style.cursor = 'pointer';
                        homeBtn.style.color = 'var(--accent)';
                        homeBtn.onclick = () => browseFolders('', isEdit);
                        breadcrumb.appendChild(homeBtn);
                        
                        // Parse path segments
                        const parts = data.current.replace(/\\\\/g, '/').split('/').filter(Boolean);
                        let accumulated = '';
                        parts.forEach((part, i) => {
                            const sep = document.createElement('span');
                            sep.textContent = ' › ';
                            sep.style.color = 'var(--text-secondary)';
                            breadcrumb.appendChild(sep);
                            
                            accumulated += part + (i === 0 && data.current.includes(':') ? '\\\\' : '\\\\');
                            const link = document.createElement('span');
                            link.textContent = part;
                            link.style.cursor = 'pointer';
                            link.style.color = i === parts.length - 1 ? 'var(--text-primary)' : 'var(--accent)';
                            const navPath = accumulated;
                            link.onclick = () => browseFolders(navPath, isEdit);
                            breadcrumb.appendChild(link);
                        });
                    } else {
                        breadcrumb.innerHTML = '<i class="fa-solid fa-hard-drive"></i> <span style="margin-left:5px;">Selecciona una unidad</span>';
                    }
                    
                    // Folder list
                    list.innerHTML = '';
                    if (data.items.length === 0) {
                        list.innerHTML = '<p style="color:var(--text-secondary); padding:15px; text-align:center;">Carpeta vacía</p>';
                        return;
                    }
                    
                    data.items.forEach(item => {
                        const row = document.createElement('div');
                        row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px 15px; cursor:pointer; border-radius:5px; transition:background 0.1s;';
                        row.innerHTML = `<i class="fa-solid fa-folder" style="color:#FFC107; font-size:1.1rem;"></i> <span style="font-size:0.9rem;">${item.name}</span>`;
                        row.onmouseover = () => row.style.background = 'var(--bg-hover)';
                        row.onmouseout = () => row.style.background = 'transparent';
                        row.onclick = () => browseFolders(item.path, isEdit);
                        list.appendChild(row);
                    });
                } else {
                    list.innerHTML = `<p style="color:#ff4444; padding:15px;">${data.message}</p>`;
                }
            })
            .catch(err => {
                list.innerHTML = '<p style="color:#ff4444; padding:15px;">Error al cargar carpetas.</p>';
            });
    }

    function selectCurrentFolder(isEdit = false) {
        if (folderBrowserCurrentPath) {
            const inputId = isEdit ? 'edit-lib-ruta-display' : 'lib-ruta-display';
            const browserId = isEdit ? 'edit-folder-browser' : 'folder-browser';
            const nameInputId = isEdit ? 'edit-lib-nombre' : 'lib-nombre';

            document.getElementById(inputId).value = folderBrowserCurrentPath;
            document.getElementById(browserId).style.display = 'none';
            
            // Auto-rellenar nombre si está vacío
            const nombreInput = document.getElementById(nameInputId);
            if (!nombreInput.value) {
                const parts = folderBrowserCurrentPath.replace(/\\\\/g, '/').split('/').filter(Boolean);
                nombreInput.value = parts[parts.length - 1] || folderBrowserCurrentPath;
            }
        }
    }

    function pickLibraryFolder() {
        toggleFolderBrowser();
    }

    function saveLibrary() {
        const ruta = document.getElementById('lib-ruta-display').value;
        const nombre = document.getElementById('lib-nombre').value;
        const tipo = document.getElementById('lib-tipo').value;

        if(!ruta || !nombre) {
            alert('Por favor completa todos los campos.');
            return;
        }

        fetch('api/bibliotecas/add.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ruta, nombre, tipo })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                closeAddLibraryModal();
                loadLibraries();
                // Opcional: Escanear automáticamente
                if(confirm('Biblioteca agregada. ¿Deseas escanearla ahora? Esto puede tardar varios minutos dependiendo del tamaño.')) {
                    scanLibrary(data.id);
                }
            } else {
                alert(data.message);
            }
        });
    }

    function saveEditLibrary() {
        const id = document.getElementById('edit-lib-id').value;
        const ruta = document.getElementById('edit-lib-ruta-display').value;
        const nombre = document.getElementById('edit-lib-nombre').value;
        const tipo = document.getElementById('edit-lib-tipo').value;

        if(!id || !ruta || !nombre) {
            alert('Por favor completa todos los campos.');
            return;
        }

        fetch('api/bibliotecas/edit.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ruta, nombre, tipo })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                closeEditLibraryModal();
                loadLibraries();
            } else {
                alert(data.message);
            }
        });
    }

    function deleteLibrary(id, nombre) {
        if(confirm(`¿Estás seguro que deseas eliminar la biblioteca "${nombre}"? Todo el contenido indexado será removido de la base de datos (los archivos originales no se borrarán).`)) {
            fetch('api/bibliotecas/delete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    loadLibraries();
                    fetchMedia(); // Recargar el contenido global ya que se ha eliminado contenido
                } else {
                    alert(data.message);
                }
            });
        }
    }

    function scanLibrary(id, btnElement = null) {
        if(btnElement) {
            btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Escaneando...';
            btnElement.disabled = true;
        }
        
        fetch('api/bibliotecas/scanner.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message || 'Escaneo finalizado.');
            loadLibraries();
            fetchMedia(); // Recargar datos globales
        })
        .catch(err => {
            alert('Hubo un error durante el escaneo.');
            if(btnElement) {
                btnElement.innerHTML = '<i class="fa-solid fa-rotate"></i> Escanear ahora';
                btnElement.disabled = false;
            }
        });
    }

    function saveSettings() {
        const vol = document.getElementById('admin-vol-default').value;
        const zoom = document.getElementById('admin-zoom-default') ? document.getElementById('admin-zoom-default').value : 1;
        const musicFolder = document.getElementById('admin-music-folder').value;
        
        const settings = { 
            volume: parseFloat(vol),
            zoom: parseFloat(zoom),
            music_folder: musicFolder
        };
        
        fetch('api/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                alert('Ajustes guardados correctamente. La página se recargará para aplicar los cambios en la biblioteca.');
                window.location.reload();
            }
        });
    }

    // --- Sync Lyrics Logic ---
    function updateSyncLyricsDOM() {
        document.querySelectorAll('.lyrics-card-container').forEach(container => {
            const btn = container.querySelector('.btn-sync-lyrics-dynamic');
            if (btn) {
                btn.disabled = syncLyricsState.btnDisabled;
                btn.innerHTML = syncLyricsState.btnHtml;
            }
            let wrapper = container.querySelector('.sync-lyrics-wrapper');
            if (wrapper) {
                wrapper.style.display = syncLyricsState.isRunning || syncLyricsState.percent > 0 ? 'block' : 'none';
                const textEl = wrapper.querySelector('.sync-lyrics-text');
                const countEl = wrapper.querySelector('.sync-lyrics-count');
                const barEl = wrapper.querySelector('.sync-lyrics-bar');
                if(textEl) textEl.textContent = syncLyricsState.text;
                if(countEl) countEl.textContent = syncLyricsState.count;
                if(barEl) barEl.style.width = syncLyricsState.percent + '%';
            }
        });
    }

    async function syncAllLyrics(btn) {
        if (syncLyricsState.isRunning) return;
        
        syncLyricsState.isRunning = true;
        syncLyricsState.btnDisabled = true;
        syncLyricsState.btnHtml = '<i class="fa-solid fa-spinner fa-spin"></i> Obteniendo catálogo...';
        syncLyricsState.percent = 0;
        updateSyncLyricsDOM();
        
        try {
            // Fetch all songs
            const res = await fetch('api/canciones_all.php');
            const data = await res.json();
            
            if (data.status !== 'success' || !data.data || data.data.length === 0) {
                syncLyricsState.text = 'No hay canciones en la base de datos.';
                syncLyricsState.btnHtml = '<i class="fa-solid fa-music"></i> Descargar Letras';
                syncLyricsState.btnDisabled = false;
                syncLyricsState.isRunning = false;
                updateSyncLyricsDOM();
                return;
            }

            const songs = data.data;
            const total = songs.length;
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < total; i++) {
                const song = songs[i];
                
                // Update UI
                syncLyricsState.text = `Buscando: ${song.title}...`;
                syncLyricsState.count = `${i + 1} / ${total}`;
                syncLyricsState.percent = ((i + 1) / total) * 100;
                updateSyncLyricsDOM();

                // Sync single lyric
                try {
                    const url = `api/lyrics.php?artist=${encodeURIComponent(song.artist || '')}&title=${encodeURIComponent(song.title || '')}&album=${encodeURIComponent(song.album || '')}&force=1`;
                    const syncRes = await fetch(url);
                    const syncData = await syncRes.json();
                    
                    if (syncData.found) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (e) {
                    failCount++;
                }
                
                // Rate limiting / delay
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            syncLyricsState.text = `Proceso completado. ${successCount} encontradas.`;
            syncLyricsState.percent = 100;
        } catch (e) {
            console.error(e);
            syncLyricsState.text = 'Error al obtener canciones.';
        } finally {
            syncLyricsState.btnHtml = '<i class="fa-solid fa-check"></i> Finalizado';
            syncLyricsState.btnDisabled = false;
            syncLyricsState.isRunning = false;
            updateSyncLyricsDOM();
        }
    }

    init();

    // Public API
    return {
        syncStateToRemote,
        navigate,
        toggleQueue,
        clearQueue,
        togglePlay,
        playItem,
        prev,
        next,
        toggleFullscreenMode,
        minimizeFullscreenOverlay,
        restoreFullscreenOverlay,
        toggleMusicVisualizer,
        calibrateTouchScreen,
        saveSettings,
        initAdmin,
        showAddLibraryModal,
        closeAddLibraryModal,
        showEditLibraryModal,
        closeEditLibraryModal,
        pickLibraryFolder,
        toggleFolderBrowser,
        selectCurrentFolder,
        saveLibrary,
        saveEditLibrary,
        deleteLibrary,
        scanLibrary,
        playNow,
        addToQueue,
        playFromQueue,
        moveQueueUp,
        moveQueueDown,
        removeFromQueue,
        playAllArtist,
        playAllAlbum,
        addAllAlbumToQueue,
        syncArtistImages,
        syncAllLyrics,
        toggleShuffle,
        toggleRepeat,
        toggleMute,
        toggleQueuePanel
    };
})();

// --- Sync Artists Logic ---
async function syncArtistImages() {
    const btn = document.getElementById('btn-sync-artists');
    const wrapper = document.getElementById('sync-progress-wrapper');
    const bar = document.getElementById('sync-progress-bar');
    const text = document.getElementById('sync-progress-text');
    const countLabel = document.getElementById('sync-progress-count');

    if(!btn || !wrapper) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparando...';
    wrapper.classList.remove('hidden');
    bar.style.width = '0%';
    
    try {
        // Fetch all artists
        const res = await fetch('api/artistas.php');
        const data = await res.json();
        
        if (data.status !== 'success' || !data.data || data.data.length === 0) {
            text.textContent = 'No hay artistas en la base de datos.';
            btn.innerHTML = '<i class="fa-solid fa-download"></i> Descargar Todas';
            btn.disabled = false;
            return;
        }

        const artists = data.data;
        const total = artists.length;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < total; i++) {
            const artist = artists[i];
            
            // Update UI
            text.textContent = `Descargando: ${artist.nombre}...`;
            countLabel.textContent = `${i + 1} / ${total}`;
            bar.style.width = `${((i + 1) / total) * 100}%`;

            // Sync single artist
            try {
                const syncRes = await fetch('api/sync_artist.php?name=' + encodeURIComponent(artist.nombre));
                const syncData = await syncRes.json();
                if (syncData.status === 'success') {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (e) {
                failCount++;
            }
            
            // Small delay to prevent browser locking and server spam
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        text.textContent = `¡Completado! Éxito: ${successCount}. Fallos: ${failCount}.`;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Sincronización Completa';
        
    } catch (err) {
        text.textContent = 'Error al obtener la lista de artistas.';
        btn.innerHTML = '<i class="fa-solid fa-download"></i> Reintentar';
        btn.disabled = false;
    }
}

// --- Virtual Keyboard ---
const keyboardContainer = document.getElementById('virtual-keyboard');
let vkShifted = false;

const keyLayouts = {
    normal: [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-', '_']
    ],
    shifted: [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '!', '?']
    ]
};

function renderKeyboard() {
    if (!keyboardContainer) return;
    keyboardContainer.innerHTML = '';
    
    const layout = vkShifted ? keyLayouts.shifted : keyLayouts.normal;
    
    layout.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'vk-row';
        
        if (rowIndex === 2) {
            const shiftKey = document.createElement('div');
            shiftKey.className = 'vk-key vk-wide';
            shiftKey.innerHTML = vkShifted ? '<i class="fa-solid fa-arrow-down"></i>' : '<i class="fa-solid fa-arrow-up"></i>';
            shiftKey.onclick = () => {
                vkShifted = !vkShifted;
                renderKeyboard();
            };
            rowDiv.appendChild(shiftKey);
        }

        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'vk-key';
            keyDiv.textContent = key;
            keyDiv.onclick = () => handleVkKeyPress(key);
            rowDiv.appendChild(keyDiv);
        });
        
        if (rowIndex === 2) {
            const backKey = document.createElement('div');
            backKey.className = 'vk-key vk-wide';
            backKey.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
            backKey.onclick = () => handleVkKeyPress('backspace');
            rowDiv.appendChild(backKey);
        }

        keyboardContainer.appendChild(rowDiv);
    });

    const bottomRow = document.createElement('div');
    bottomRow.className = 'vk-row';
    
    const closeKey = document.createElement('div');
    closeKey.className = 'vk-key vk-close';
    closeKey.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    closeKey.onclick = hideKeyboard;
    
    const spaceKey = document.createElement('div');
    spaceKey.className = 'vk-key vk-space';
    spaceKey.textContent = 'Espacio';
    spaceKey.onclick = () => handleVkKeyPress(' ');
    
    const searchKey = document.createElement('div');
    searchKey.className = 'vk-key vk-wide';
    searchKey.style.background = 'var(--accent)';
    searchKey.style.color = '#000';
    searchKey.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
    searchKey.onclick = hideKeyboard;

    bottomRow.appendChild(closeKey);
    bottomRow.appendChild(spaceKey);
    bottomRow.appendChild(searchKey);
    keyboardContainer.appendChild(bottomRow);
}

function handleVkKeyPress(key) {
    const searchInput = document.getElementById('global-search');
    if (!searchInput) return;
    
    let start = searchInput.selectionStart;
    let end = searchInput.selectionEnd;
    let val = searchInput.value;
    
    if (key === 'backspace') {
        if (start === end && start > 0) {
            searchInput.value = val.slice(0, start - 1) + val.slice(end);
            searchInput.selectionStart = searchInput.selectionEnd = start - 1;
        } else if (start !== end) {
            searchInput.value = val.slice(0, start) + val.slice(end);
            searchInput.selectionStart = searchInput.selectionEnd = start;
        }
    } else {
        searchInput.value = val.slice(0, start) + key + val.slice(end);
        searchInput.selectionStart = searchInput.selectionEnd = start + 1;
    }
    
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus(); // Keep focus
}

function showKeyboard() {
    if (keyboardContainer) {
        renderKeyboard();
        keyboardContainer.classList.remove('vk-hidden');
    }
}

function hideKeyboard() {
    if (keyboardContainer) {
        keyboardContainer.classList.add('vk-hidden');
    }
}

// ==========================================
// Remote Control Polling
// ==========================================
function startRemotePolling() {
    setInterval(() => {
        fetch('api/remote_sync.php?action=poll')
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success' && data.commands) {
                data.commands.forEach(cmdObj => {
                    const {cmd, val} = cmdObj;
                    if(cmd === 'play_pause') app.togglePlay();
                    else if(cmd === 'next') app.next();
                    else if(cmd === 'prev') app.prev();
                    else if(cmd === 'play_item') {
                        try {
                            const item = JSON.parse(val);
                            app.playItem(item);
                        } catch(e) { console.error('Error parsing remote item', e); }
                    }
                    else if(cmd === 'vol_up') {
                        const audioPlayer = document.getElementById('audio-player');
                        const videoPlayer = document.getElementById('video-player');
                        if(audioPlayer) audioPlayer.volume = Math.min(1, audioPlayer.volume + 0.1);
                        if(videoPlayer) videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1);
                    }
                    else if(cmd === 'vol_down') {
                        const audioPlayer = document.getElementById('audio-player');
                        const videoPlayer = document.getElementById('video-player');
                        if(audioPlayer) audioPlayer.volume = Math.max(0, audioPlayer.volume - 0.1);
                        if(videoPlayer) videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1);
                    }
                    else if(cmd === 'request_state') {
                        if (typeof app.syncStateToRemote === 'function') {
                            app.syncStateToRemote();
                        }
                        const modal = document.getElementById('remote-modal');
                        if (modal && !modal.classList.contains('hidden')) {
                            modal.classList.add('hidden');
                            
                            let toast = document.getElementById('remote-toast');
                            if (!toast) {
                                toast = document.createElement('div');
                                toast.id = 'remote-toast';
                                toast.style.position = 'fixed';
                                toast.style.bottom = '120px';
                                toast.style.left = '50%';
                                toast.style.transform = 'translateX(-50%)';
                                toast.style.background = 'var(--accent)';
                                toast.style.color = '#fff';
                                toast.style.padding = '12px 24px';
                                toast.style.borderRadius = '30px';
                                toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
                                toast.style.zIndex = '9999';
                                toast.style.fontWeight = 'bold';
                                toast.style.transition = 'opacity 0.3s ease';
                                toast.innerHTML = '<i class="fa-solid fa-check-circle" style="margin-right:8px;"></i> Control Remoto Conectado';
                                document.body.appendChild(toast);
                            }
                            toast.style.opacity = '1';
                            setTimeout(() => toast.style.opacity = '0', 3000);
                        }
                    }
                    else if(cmd === 'toggle_shuffle') {
                        if (typeof toggleShuffle === 'function') {
                            toggleShuffle();
                            if (typeof app.syncStateToRemote === 'function') app.syncStateToRemote();
                        }
                    }
                    else if(cmd === 'toggle_repeat') {
                        if (typeof toggleRepeat === 'function') {
                            toggleRepeat();
                            if (typeof app.syncStateToRemote === 'function') app.syncStateToRemote();
                        }
                    }
                    else if(cmd === 'seek') {
                        const targetTime = parseFloat(val);
                        const player = (queue[currentIndex] && queue[currentIndex].type === 'music') ? document.getElementById('audio-player') : document.getElementById('video-player');
                        if (player && !isNaN(targetTime)) {
                            player.currentTime = targetTime;
                            if (typeof app.syncStateToRemote === 'function') app.syncStateToRemote();
                        }
                    }
                });
            }
        }).catch(err => {
            // Silently ignore polling network errors
        });
    }, 1500);
}

// Start polling
startRemotePolling();
