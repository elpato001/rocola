<?php
// Deshabilitar el almacenamiento en búfer de salida para grandes archivos
while (ob_get_level()) ob_end_clean();

if (!isset($_GET['file'])) {
    header("HTTP/1.0 400 Bad Request");
    exit("Missing file parameter");
}

$filepath = base64_decode($_GET['file']);

// Validar que el archivo exista y sea un archivo
if (!file_exists($filepath) || !is_file($filepath)) {
    header("HTTP/1.0 404 Not Found");
    exit("File not found");
}

// Prevenir acceso a archivos fuera de un disco local de Windows o archivos de sistema críticos (Básico)
// Asumiremos que el usuario provee una ruta absoluta.
$ext = strtolower(pathinfo($filepath, PATHINFO_EXTENSION));
$allowed_exts = ['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'mkv', 'webm'];

if (!in_array($ext, $allowed_exts)) {
    header("HTTP/1.0 403 Forbidden");
    exit("File type not allowed");
}

$size = filesize($filepath);
$time = date('r', filemtime($filepath));

$fm = @fopen($filepath, 'rb');
if (!$fm) {
    header("HTTP/1.0 505 Internal Server Error");
    exit("Could not open file");
}

$begin = 0;
$end = $size - 1;

if (isset($_SERVER['HTTP_RANGE'])) {
    if (preg_match('/bytes=\h*(\d+)-(\d*)[\D.*]?/i', $_SERVER['HTTP_RANGE'], $matches)) {
        $begin = intval($matches[1]);
        if (!empty($matches[2])) {
            $end = intval($matches[2]);
        }
    }
}

if (isset($_SERVER['HTTP_RANGE'])) {
    header('HTTP/1.1 206 Partial Content');
} else {
    header('HTTP/1.1 200 OK');
}

$mime_types = [
    'mp3' => 'audio/mpeg',
    'wav' => 'audio/wav',
    'ogg' => 'audio/ogg',
    'm4a' => 'audio/mp4',
    'mp4' => 'video/mp4',
    'webm' => 'video/webm',
    'mkv' => 'video/x-matroska'
];

$mime = isset($mime_types[$ext]) ? $mime_types[$ext] : 'application/octet-stream';

header("Content-Type: $mime");
header('Cache-Control: public, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Accept-Ranges: bytes');
header('Content-Length: ' . (($end - $begin) + 1));
if (isset($_SERVER['HTTP_RANGE'])) {
    header("Content-Range: bytes $begin-$end/$size");
}
header("Content-Disposition: inline; filename=\"" . basename($filepath) . "\"");
header("Content-Transfer-Encoding: binary");
header("Last-Modified: $time");

fseek($fm, $begin, 0);
$cur = $begin;

// Buffer de 8KB
$buffer_size = 1024 * 8; 

while (!feof($fm) && $cur <= $end && (connection_status() == 0)) {
    $bytes_to_read = min($buffer_size, ($end - $cur) + 1);
    print fread($fm, $bytes_to_read);
    $cur += $bytes_to_read;
    flush();
}

fclose($fm);
exit;
?>
