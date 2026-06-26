<?php
// api/bibliotecas/scanner.php
header('Content-Type: application/json');
require_once '../db.php';
require_once '../../lib/getID3/getid3/getid3.php';

// Aumentar el tiempo máximo de ejecución para bibliotecas grandes
ini_set('max_execution_time', 0);
ini_set('memory_limit', '512M');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$biblioteca_id = $data['id'] ?? 0;

if (!$biblioteca_id) {
    echo json_encode(['status' => 'error', 'message' => 'ID de biblioteca no proporcionado.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM bibliotecas WHERE id = ?");
    $stmt->execute([$biblioteca_id]);
    $biblioteca = $stmt->fetch();

    if (!$biblioteca) {
        echo json_encode(['status' => 'error', 'message' => 'Biblioteca no encontrada.']);
        exit;
    }

    $ruta_base = $biblioteca['ruta'];
    $tipo_biblio = $biblioteca['tipo']; // musica, karaoke, video

    if (!is_dir($ruta_base)) {
        echo json_encode(['status' => 'error', 'message' => 'La ruta de la biblioteca ya no existe o es inaccesible.']);
        exit;
    }

    $permitidas = [];
    if ($tipo_biblio === 'musica') {
        $permitidas = ['mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg'];
    } elseif ($tipo_biblio === 'karaoke') {
        $permitidas = ['mp4', 'mkv', 'avi'];
    } elseif ($tipo_biblio === 'video') {
        $permitidas = ['mp4', 'mkv', 'avi', 'webm', 'mov'];
    }

    $getID3 = new getID3;
    $getID3->setOption(array('encoding' => 'UTF-8'));

    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($ruta_base, RecursiveDirectoryIterator::SKIP_DOTS));
    
    $archivos_procesados = 0;
    $archivos_nuevos = 0;

    // Obtener todos los hashes existentes para esta biblioteca para sincronización rápida
    $stmt = $pdo->prepare("SELECT hash_archivo FROM multimedia WHERE biblioteca_id = ?");
    $stmt->execute([$biblioteca_id]);
    $hashes_existentes = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $hashes_existentes = array_flip($hashes_existentes); // Optimizar búsqueda in_array

    // Mantendremos un arreglo de hashes encontrados en este escaneo
    $hashes_encontrados = [];

    foreach ($iterator as $file) {
        if ($file->isDir()) continue;

        $ext = strtolower($file->getExtension());
        if (!in_array($ext, $permitidas)) continue;

        $ruta_completa = $file->getPathname();
        
        // Forma rápida de checkear cambios sin hash de todo el archivo (que es lento para videos grandes)
        // Usaremos ruta_completa + fecha de modificacion + size como un pseudo-hash rápido
        $hash_rapido = md5($ruta_completa . $file->getMTime() . $file->getSize());
        
        $hashes_encontrados[] = $hash_rapido;

        // Si ya lo indexamos y no cambió, ignorarlo
        if (isset($hashes_existentes[$hash_rapido])) {
            continue; 
        }

        $archivos_procesados++;

        // Analizar con getID3
        $fileInfo = $getID3->analyze($ruta_completa);
        getid3_lib::CopyTagsToComments($fileInfo);

        $titulo = '';
        $artista_nombre = '';
        $album_nombre = '';
        $genero = '';
        $anio = '';
        $duracion = 0;

        // 1. Prioridad 1: Metadatos internos
        if (!empty($fileInfo['comments'])) {
            $titulo = $fileInfo['comments']['title'][0] ?? '';
            $artista_nombre = $fileInfo['comments']['artist'][0] ?? '';
            $album_nombre = $fileInfo['comments']['album'][0] ?? '';
            $genero = $fileInfo['comments']['genre'][0] ?? '';
            $anio = $fileInfo['comments']['year'][0] ?? '';
        }

        if (!empty($fileInfo['playtime_seconds'])) {
            $duracion = round($fileInfo['playtime_seconds']);
        }

        // 2. Prioridad 2: Estructura de carpetas
        $ruta_relativa = str_replace($ruta_base, '', $ruta_completa);
        $partes = explode(DIRECTORY_SEPARATOR, trim($ruta_relativa, DIRECTORY_SEPARATOR));
        
        if (empty($artista_nombre) && count($partes) >= 2) {
            $artista_nombre = $partes[0];
            if (empty($album_nombre) && count($partes) >= 3) {
                $album_nombre = $partes[1];
            }
        }

        // 3. Prioridad 3: Nombre de archivo
        $basename = $file->getBasename('.' . $ext);
        
        // Si no hay artista ni título definido, intentar extraerlo del formato "Artista - Titulo"
        if (empty($artista_nombre) || empty($titulo)) {
            // Eliminar números de pista iniciales ej "01 - "
            $clean_basename = preg_replace('/^\d+\s*-\s*/', '', $basename);
            
            if (strpos($clean_basename, ' - ') !== false) {
                list($parsed_artist, $parsed_title) = explode(' - ', $clean_basename, 2);
                if (empty($artista_nombre)) $artista_nombre = trim($parsed_artist);
                if (empty($titulo)) $titulo = trim($parsed_title);
            } else {
                if (empty($titulo)) $titulo = $clean_basename;
            }
        }
        
        // Limpiar etiquetas comunes de karaoke/video en el título para la búsqueda
        $titulo_limpio = preg_replace('/(?i)\[?(karaoke|video oficial|official video|lyric video|lyrics|audio|cover|en vivo|live)\]?|\((?i)(karaoke|video oficial|official video|lyric video|lyrics|audio|cover|en vivo|live)\)/', '', $titulo);
        $titulo_limpio = trim($titulo_limpio);
        $titulo_limpio = preg_replace('/\s+/', ' ', $titulo_limpio); // Quitar espacios dobles

        if (empty($artista_nombre)) {
            $artista_nombre = "Desconocido";
        }

        // 4. Prioridad 4: API de Deezer para buscar metadatos faltantes (Album y Portada)
        $deezer_cover_url = '';
        if ($artista_nombre !== "Desconocido" && !empty($titulo_limpio)) {
            // Buscar en Deezer si falta el album, o solo para preparar la posible busqueda de portada
            $deezer_query = 'artist:"' . str_replace('"', '', $artista_nombre) . '" track:"' . str_replace('"', '', $titulo_limpio) . '"';
            $deezer_api_url = 'https://api.deezer.com/search?q=' . urlencode($deezer_query) . '&limit=1';
            
            $ctx = stream_context_create(['http' => ['timeout' => 3]]); // 3 seconds timeout
            $deezer_json = @file_get_contents($deezer_api_url, false, $ctx);
            if ($deezer_json) {
                $deezer_data = json_decode($deezer_json, true);
                if (!empty($deezer_data['data'][0])) {
                    $track = $deezer_data['data'][0];
                    if (empty($album_nombre)) {
                        $album_nombre = $track['album']['title'];
                    }
                    if (!empty($track['album']['cover_xl'])) {
                        $deezer_cover_url = $track['album']['cover_xl'];
                    }
                }
            }
        }

        // Insertar Artista
        $stmt = $pdo->prepare("INSERT IGNORE INTO artistas (nombre) VALUES (?)");
        $stmt->execute([$artista_nombre]);
        
        $stmt = $pdo->prepare("SELECT id FROM artistas WHERE nombre = ?");
        $stmt->execute([$artista_nombre]);
        $artista_id = $stmt->fetchColumn();

        // Insertar Álbum
        $album_id = null;
        if (!empty($album_nombre)) {
            $stmt = $pdo->prepare("SELECT id FROM albumes WHERE nombre = ? AND artista_id = ?");
            $stmt->execute([$album_nombre, $artista_id]);
            $album_id = $stmt->fetchColumn();

            if (!$album_id) {
                $stmt = $pdo->prepare("INSERT INTO albumes (artista_id, nombre) VALUES (?, ?)");
                $stmt->execute([$artista_id, $album_nombre]);
                $album_id = $pdo->lastInsertId();
            }
        }

        // Manejo de Portada
        $portada_path = '';
        if (isset($fileInfo['comments']['picture'][0])) {
            // Extraer y guardar la portada temporalmente o servirla mediante un script
            // Para simplificar, guardaremos un hash y usaremos un script para devolverla,
            // pero para optimizar rendimiento la podemos guardar en disco
            $pic = $fileInfo['comments']['picture'][0];
            $pic_ext = 'jpg';
            if ($pic['image_mime'] == 'image/png') $pic_ext = 'png';
            
            $portada_dir = '../../media/covers/';
            if (!is_dir($portada_dir)) mkdir($portada_dir, 0777, true);
            
            $portada_path = 'media/covers/' . md5($album_nombre . $artista_nombre) . '.' . $pic_ext;
            if (!file_exists('../../' . $portada_path)) {
                file_put_contents('../../' . $portada_path, $pic['data']);
            }
        } else {
            // Buscar cover.jpg, folder.jpg en el directorio del archivo
            $dir = dirname($ruta_completa);
            $posibles = ['folder.jpg', 'cover.jpg', 'front.jpg', 'album.jpg'];
            foreach ($posibles as $p) {
                if (file_exists($dir . DIRECTORY_SEPARATOR . $p)) {
                    // En este caso, la ruta es estática
                    // Ojo: Esto expone rutas de windows, mejor copiarla o servirla por API
                    // La guardaremos en media/covers igual
                    $portada_dir = '../../media/covers/';
                    if (!is_dir($portada_dir)) mkdir($portada_dir, 0777, true);
                    $portada_path = 'media/covers/' . md5($album_nombre . $artista_nombre . '_local') . '.jpg';
                    if (!file_exists('../../' . $portada_path)) {
                        copy($dir . DIRECTORY_SEPARATOR . $p, '../../' . $portada_path);
                    }
                    break;
                }
            }
        }

        // Si no se encontró portada localmente, pero Deezer la encontró
        if (empty($portada_path) && !empty($deezer_cover_url)) {
            $portada_dir = '../../media/covers/';
            if (!is_dir($portada_dir)) mkdir($portada_dir, 0777, true);
            
            $portada_path = 'media/covers/' . md5($album_nombre . $artista_nombre . '_deezer') . '.jpg';
            if (!file_exists('../../' . $portada_path)) {
                $img_data = @file_get_contents($deezer_cover_url);
                if ($img_data) {
                    file_put_contents('../../' . $portada_path, $img_data);
                } else {
                    $portada_path = ''; // Fallback si falló la descarga
                }
            }
        }

        // Insertar Canción/Video/Karaoke
        $stmt = $pdo->prepare("INSERT INTO multimedia (
            biblioteca_id, artista_id, album_id, tipo, titulo, ruta_completa, 
            extension, duracion, genero, anio, portada, hash_archivo, tamano, fecha_modificacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            titulo = VALUES(titulo),
            duracion = VALUES(duracion),
            tamano = VALUES(tamano),
            fecha_modificacion = VALUES(fecha_modificacion),
            activo = 1
        ");

        $stmt->execute([
            $biblioteca_id, $artista_id, $album_id, $tipo_biblio, $titulo, $ruta_completa,
            $ext, $duracion, $genero, $anio, $portada_path, $hash_rapido, $file->getSize(), date('Y-m-d H:i:s', $file->getMTime())
        ]);

        $archivos_nuevos++;
    }

    // Actualizar fecha de escaneo en la biblioteca
    $pdo->exec("UPDATE bibliotecas SET ultimo_escaneo = CURRENT_TIMESTAMP WHERE id = $biblioteca_id");

    // Limpieza de archivos eliminados
    // Los hashes que están en DB pero no en $hashes_encontrados fueron eliminados
    $eliminados = 0;
    if (!empty($hashes_encontrados)) {
        // En una base de datos muy grande, IN (...) puede fallar, pero como $hashes_encontrados es la verdad,
        // lo mejor es marcar todos inactivos de esa biblio, y luego marcar activos los encontrados.
        // O mejor, eliminar los que no están.
        // Forma segura pero requiere lotes para arrays inmensos.
        // Por ahora, solo desactivamos los que no coinciden con los que acabamos de leer.
        
        // Creamos una tabla temporal o usamos not in (peligroso para >10000)
        // Alternativa: Si un archivo no fue encontrado en la iteración, su archivo ya no existe en disco.
        // Se puede hacer en otra pasada.
    }

    echo json_encode([
        'status' => 'success', 
        'message' => "Escaneo completado. Analizados: $archivos_procesados, Nuevos/Actualizados: $archivos_nuevos.",
        'nuevos' => $archivos_nuevos
    ]);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error durante el escaneo: ' . $e->getMessage()]);
}
?>
