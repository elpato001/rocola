<?php
$configFile = __DIR__ . '/api/config.json';
if (file_exists($configFile)) {
    $config = json_decode(file_get_contents($configFile), true);
    $host = $config['db_host'] ?? 'localhost';
    $user = $config['db_user'] ?? 'root';
    $pass = $config['db_pass'] ?? '';
    $dbname = $config['db_name'] ?? 'rockola';
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
        // Si conecta correctamente y la base de datos existe, redirigimos
        header('Location: index.php');
        exit;
    } catch (PDOException $e) {
        // Si falla (BD borrada), no hacemos redirect, permitimos mostrar el wizard
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instalación - Rockola Multimedia</title>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Estilos Globales -->
    <link rel="stylesheet" href="css/style.css">
    <style>
        body {
            display: flex;
            flex-direction: row;
            min-height: 100vh;
            background: #0f0f13;
            margin: 0;
            font-family: 'Inter', sans-serif;
            color: #fff;
            overflow-x: hidden;
        }

        /* Columna Izquierda (Banner) */
        .wizard-left {
            flex: 1;
            background-image: linear-gradient(to right, rgba(15, 15, 19, 0.2), #0f0f13), url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80');
            background-size: cover;
            background-position: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 80px;
            position: relative;
        }

        .wizard-left::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(135deg, rgba(0, 194, 255, 0.2) 0%, rgba(255, 0, 128, 0.2) 100%);
            mix-blend-mode: overlay;
        }

        .wizard-brand {
            position: relative;
            z-index: 2;
        }

        .wizard-brand i {
            font-size: 4rem;
            color: var(--accent);
            margin-bottom: 20px;
            text-shadow: 0 0 30px rgba(0, 194, 255, 0.6);
            animation: pulse-glow 2s infinite alternate;
        }

        @keyframes pulse-glow {
            from { text-shadow: 0 0 20px rgba(0, 194, 255, 0.4); }
            to { text-shadow: 0 0 40px rgba(0, 194, 255, 0.8), 0 0 80px rgba(0, 194, 255, 0.4); }
        }

        .wizard-brand h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 4.5rem;
            line-height: 1;
            margin: 0 0 20px 0;
            background: linear-gradient(to right, #fff, #b3e6ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .wizard-brand p {
            font-size: 1.3rem;
            color: rgba(255, 255, 255, 0.7);
            max-width: 400px;
            line-height: 1.6;
        }

        /* Columna Derecha (Formulario) */
        .wizard-right {
            width: 550px;
            max-width: 100%;
            background: #15151c;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 60px;
            box-shadow: -20px 0 50px rgba(0,0,0,0.5);
            position: relative;
            z-index: 10;
        }

        .wizard-step {
            animation: fade-in-up 0.5s ease forwards;
        }

        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .step-header {
            margin-bottom: 40px;
        }

        .step-header h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 2.2rem;
            margin: 0 0 10px 0;
        }

        .step-header p {
            color: var(--text-secondary);
            margin: 0;
            font-size: 1.05rem;
        }

        .form-group {
            margin-bottom: 25px;
            position: relative;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 0.9rem;
            color: #aaa;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .form-group .input-icon {
            position: absolute;
            bottom: 15px;
            left: 15px;
            color: #666;
            font-size: 1.1rem;
            transition: color 0.3s;
        }

        .form-group input {
            width: 100%;
            padding: 15px 15px 15px 45px;
            background: rgba(255, 255, 255, 0.03);
            border: 2px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            color: #fff;
            font-size: 1.05rem;
            transition: all 0.3s;
            box-sizing: border-box;
        }

        .form-group input:focus {
            outline: none;
            border-color: var(--accent);
            background: rgba(0, 194, 255, 0.05);
            box-shadow: 0 0 20px rgba(0, 194, 255, 0.1);
        }

        .form-group input:focus + .input-icon,
        .form-group input:not(:placeholder-shown) + .input-icon {
            color: var(--accent);
        }

        .install-btn {
            background: linear-gradient(135deg, var(--accent), #0077ff);
            color: #fff;
            border: none;
            padding: 16px;
            width: 100%;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 25px rgba(0, 194, 255, 0.3);
        }

        .install-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 35px rgba(0, 194, 255, 0.4);
        }

        .install-btn:active {
            transform: translateY(0);
        }

        .install-btn.secondary {
            background: transparent;
            border: 2px solid rgba(255,255,255,0.1);
            box-shadow: none;
            color: #aaa;
        }

        .install-btn.secondary:hover {
            border-color: rgba(255,255,255,0.3);
            color: #fff;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        #error-msg {
            color: #ff4d4d;
            background: rgba(255, 77, 77, 0.1);
            border-left: 4px solid #ff4d4d;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            display: none;
            font-size: 0.95rem;
            font-weight: 500;
        }

        #loading {
            display: none;
            margin-top: 20px;
            text-align: center;
            color: var(--accent);
            font-weight: 600;
            font-size: 0.95rem;
        }

        #loading i {
            margin-right: 8px;
        }
        
        .success-icon {
            font-size: 5rem;
            color: #00cc66;
            margin-bottom: 20px;
            display: inline-block;
            text-shadow: 0 0 30px rgba(0, 204, 102, 0.4);
            animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        @keyframes pop-in {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 900px) {
            body {
                flex-direction: column;
            }
            .wizard-left {
                padding: 40px 20px;
                text-align: center;
            }
            .wizard-brand p {
                margin: 0 auto;
            }
            .wizard-right {
                width: 100%;
                padding: 40px 20px;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>

    <!-- Lado Izquierdo: Branding -->
    <div class="wizard-left">
        <div class="wizard-brand">
            <i class="fa-solid fa-compact-disc"></i>
            <h1>Rockola<br>Multimedia</h1>
            <p>El centro de entretenimiento definitivo para tu música, karaokes y videos. Configura tu sistema en unos pocos pasos y comienza a disfrutar.</p>
        </div>
    </div>

    <!-- Lado Derecho: Formulario -->
    <div class="wizard-right">
        
        <!-- PASO 1: Base de Datos -->
        <div id="step-1" class="wizard-step">
            <div class="step-header">
                <h2>Conexión MySQL</h2>
                <p>Ingresa las credenciales de tu base de datos XAMPP.</p>
            </div>

            <div id="error-msg"></div>

            <form id="install-form">
                <div class="form-group">
                    <label for="host">Servidor (Host)</label>
                    <input type="text" id="host" value="localhost" placeholder="Ej: localhost" required>
                    <i class="fa-solid fa-server input-icon"></i>
                </div>
                <div class="form-group">
                    <label for="user">Usuario</label>
                    <input type="text" id="user" value="root" placeholder="Ej: root" required>
                    <i class="fa-solid fa-user input-icon"></i>
                </div>
                <div class="form-group">
                    <label for="pass">Contraseña</label>
                    <input type="password" id="pass" placeholder="Normalmente vacío en XAMPP">
                    <i class="fa-solid fa-lock input-icon"></i>
                </div>
                <div class="form-group">
                    <label for="dbname">Base de Datos</label>
                    <input type="text" id="dbname" value="rockola" placeholder="Ej: rockola" required>
                    <i class="fa-solid fa-database input-icon"></i>
                </div>
                
                <button type="submit" class="install-btn" id="submit-btn">
                    Conectar e Instalar <i class="fa-solid fa-arrow-right"></i>
                </button>
                <div id="loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Preparando el ecosistema...</div>
            </form>
        </div>

        <!-- PASO 2: Éxito y Siguiente Acción -->
        <div id="step-2" class="wizard-step" style="display: none; text-align: center;">
            <i class="fa-solid fa-circle-check success-icon"></i>
            <div class="step-header" style="margin-bottom: 30px;">
                <h2>¡Instalación Exitosa!</h2>
                <p style="margin-top: 15px;">El motor de la Rocola está listo para rugir. <br>El siguiente paso es enlazar tus carpetas locales de música para que el sistema las indexe.</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button onclick="window.location.href='index.php?view=admin&tab=admin-library'" class="install-btn">
                    <i class="fa-solid fa-folder-plus"></i> Añadir Bibliotecas Ahora
                </button>
                <button onclick="window.location.href='index.php'" class="install-btn secondary">
                    Explorar interfaz vacía
                </button>
            </div>
        </div>

    </div>

    <script>
        document.getElementById('install-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const btn = document.getElementById('submit-btn');
            const loading = document.getElementById('loading');
            const errorMsg = document.getElementById('error-msg');
            
            btn.disabled = true;
            btn.style.opacity = '0.5';
            loading.style.display = 'block';
            errorMsg.style.display = 'none';
            
            const payload = {
                host: document.getElementById('host').value,
                user: document.getElementById('user').value,
                pass: document.getElementById('pass').value,
                dbname: document.getElementById('dbname').value
            };
            
            fetch('api/install.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    // Animación de transición al Paso 2
                    document.getElementById('step-1').style.opacity = '0';
                    setTimeout(() => {
                        document.getElementById('step-1').style.display = 'none';
                        document.getElementById('step-2').style.display = 'block';
                    }, 300);
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(err => {
                btn.disabled = false;
                btn.style.opacity = '1';
                loading.style.display = 'none';
                errorMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + err.message;
                errorMsg.style.display = 'block';
                
                // Animación de sacudida (shake)
                const form = document.getElementById('install-form');
                form.style.animation = 'shake 0.5s';
                setTimeout(() => form.style.animation = '', 500);
            });
        });
        
        // Estilo de shake dinámico
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    </script>
</body>
</html>
