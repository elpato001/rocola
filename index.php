<?php
$configFile = __DIR__ . '/api/config.json';
if (!file_exists($configFile)) {
    header('Location: setup.php');
    exit;
} else {
    $config = json_decode(file_get_contents($configFile), true);
    $host = $config['db_host'] ?? 'localhost';
    $user = $config['db_user'] ?? 'root';
    $pass = $config['db_pass'] ?? '';
    $dbname = $config['db_name'] ?? 'rockola';
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    } catch (PDOException $e) {
        header('Location: setup.php');
        exit;
    }
}

if (!defined('ROCOLA_SYSTEM')) {
    define('ROCOLA_SYSTEM', true);
}
// Get initial view if passed from URL or a fragment file
$js_initial_view = isset($_GET['view']) ? $_GET['view'] : (isset($initial_view) ? $initial_view : 'dashboard');
if ($js_initial_view == 'musica') $js_initial_view = 'music';
if ($js_initial_view == 'index') $js_initial_view = 'dashboard';
if (in_array($js_initial_view, ['albums', 'songs'])) {
    $js_initial_view = 'dashboard';
}

// Lógica para fondo aleatorio
$bg_dir = __DIR__ . '/img/backgrounds/';
$bg_url = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80'; // Default fallback
if (file_exists($bg_dir)) {
    $images = glob($bg_dir . '*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE);
    if (!empty($images)) {
        $random_image = $images[array_rand($images)];
        // Add cache buster to prevent browser caching if same name
        $bg_url = 'img/backgrounds/' . basename($random_image) . '?v=' . time();
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rockola Multimedia</title>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/style.css">
    <style>
        body {
            background-image: linear-gradient(to bottom, rgba(18, 18, 18, 0.8), rgba(18, 18, 18, 0.95)), url('<?php echo $bg_url; ?>') !important;
        }
    </style>
</head>
<body>


    <!-- Top Bar -->
    <header class="topbar">
        <div class="logo" onclick="app.navigate('dashboard')" style="cursor: pointer;">
            <i class="fa-solid fa-compact-disc"></i> Rockola
        </div>
        <div class="search-container">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" id="global-search" placeholder="Buscar música, karaoke o videos...">
            <div id="search-results" class="search-results hidden"></div>
        </div>
        <div class="topbar-actions">
            <button class="icon-btn" title="Control Remoto" onclick="openRemoteModal()">
                <i class="fa-solid fa-mobile-screen-button"></i>
            </button>
            <button class="icon-btn" title="Configuración" onclick="app.navigate('admin')">
                <i class="fa-solid fa-gear"></i>
            </button>
            <div class="user-profile">
                <img src="https://ui-avatars.com/api/?name=Admin&background=00C2FF&color=fff" alt="Admin">
            </div>
        </div>
    </header>

    <div class="main-layout">
        <!-- Contenedor Wrapper para separar Scroll de Visualizador -->
        <div class="content-wrapper" style="flex-grow: 1; position: relative; display: flex; flex-direction: column; overflow: hidden;">
            
            <!-- Main Content Area (con scroll) -->
            <main class="content-area" id="content-area">
                <?php include 'dashboard.php'; ?>
                <?php include 'generos.php'; ?>
                <?php include 'musica.php'; ?>
                <?php include 'karaoke.php'; ?>
                <?php include 'videos.php'; ?>
                <?php include 'configuracion.php'; ?>
            </main>

            <?php include 'reproductor.php'; ?>


    
    <audio id="audio-player" crossorigin="anonymous"></audio>

    <!-- Virtual Keyboard Container -->
    <div id="virtual-keyboard" class="vk-hidden"></div>

    <!-- Remote QR Modal -->
    <div id="remote-modal" class="modal hidden">
        <div class="modal-content" style="text-align: center; max-width: 400px;">
            <span class="close-btn" onclick="closeRemoteModal()">&times;</span>
            <h2>Control Remoto</h2>
            <p style="color: #aaa; margin-bottom: 20px;">Escanea este código con tu teléfono para controlar la Rocola.</p>
            <div id="qrcode" style="display: flex; justify-content: center; background: #fff; padding: 20px; border-radius: 10px; width: fit-content; margin: 0 auto;"></div>
            <p style="margin-top: 20px; color: var(--accent); font-weight: bold; font-size: 0.9rem; word-break: break-all;" id="remote-url"></p>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script>
        const INITIAL_VIEW = "<?php echo $js_initial_view; ?>";
    </script>
    <script src="js/app.js"></script>
    <script>
        <?php 
        $ips = gethostbynamel(getHostName());
        $bestIp = '127.0.0.1';
        if (is_array($ips)) {
            // Priorizar 192.168.x.x
            foreach ($ips as $ip) {
                if (strpos($ip, '192.168.') === 0) {
                    $bestIp = $ip;
                    break;
                }
            }
            // Fallback si no hay 192.168
            if ($bestIp === '127.0.0.1') {
                foreach ($ips as $ip) {
                    // Ignorar localhost y probables IPs virtuales de WSL/Docker (10.x, 172.x)
                    if ($ip !== '127.0.0.1' && strpos($ip, '10.') !== 0 && strpos($ip, '172.') !== 0) {
                        $bestIp = $ip;
                        break;
                    }
                }
            }
            // Último recurso
            if ($bestIp === '127.0.0.1') {
                foreach ($ips as $ip) {
                    if ($ip !== '127.0.0.1') {
                        $bestIp = $ip;
                        break;
                    }
                }
            }
        }
        ?>
        const serverIp = "<?php echo $bestIp; ?>";
        
        function openRemoteModal() {
            document.getElementById('remote-modal').classList.remove('hidden');
            
            const port = window.location.port ? ':' + window.location.port : '';
            const path = window.location.pathname.replace('index.php', '');
            let hostToUse = window.location.hostname;
            
            // Si accedieron localmente, forzamos la IP LAN para que el celular pueda conectarse
            if (hostToUse === 'localhost' || hostToUse === '127.0.0.1' || hostToUse === '::1') {
                hostToUse = serverIp !== '127.0.0.1' && serverIp !== '::1' ? serverIp : hostToUse;
            }
            
            const url = window.location.protocol + "//" + hostToUse + port + path + 'remote.html';
            document.getElementById('remote-url').textContent = url;
            
            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = ''; // clear previous
            new QRCode(qrContainer, {
                text: url,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }
        function closeRemoteModal() {
            document.getElementById('remote-modal').classList.add('hidden');
        }
    </script>
</body>
</html>
