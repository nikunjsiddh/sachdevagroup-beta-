<?php
/* ==========================================================================
   HELPERS
   ==========================================================================
   Escaping, form reading, dates, flash messages and image uploads. Nothing in
   here knows about the panel's layout or about the website's markup; both of
   those sit in files of their own.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Output
   --------------------------------------------------------------------------
   e() is used on every single value that reaches a page — an admin panel is
   not a safe context just because it is behind a password. The feedback table
   holds text typed by strangers, and it is READ in the panel long before an
   administrator decides whether to publish it; unescaped, a <script> in a
   visitor's note would run in the session of the person moderating it.
   -------------------------------------------------------------------------- */

if (!function_exists('e')) {
    function e($s) {
        return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

/* --------------------------------------------------------------------------
   Reading the request
   -------------------------------------------------------------------------- */

function sg_post($key, $default = '') {
    if (!isset($_POST[$key]) || is_array($_POST[$key])) return $default;
    /* Control characters have no legitimate use in a single-line field, and
       CR/LF in particular is what turns a value into a second header if one
       is ever emitted. Newlines are kept only by sg_post_text(). */
    $v = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string) $_POST[$key]);
    return trim($v);
}

function sg_post_text($key, $default = '') {
    if (!isset($_POST[$key]) || is_array($_POST[$key])) return $default;
    /* everything above except \t \n \r */
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $_POST[$key]);
    return trim(str_replace("\r\n", "\n", $v));
}

function sg_post_int($key, $default = 0) {
    return isset($_POST[$key]) && !is_array($_POST[$key]) ? (int) $_POST[$key] : $default;
}

function sg_get($key, $default = '') {
    if (!isset($_GET[$key]) || is_array($_GET[$key])) return $default;
    return trim(preg_replace('/[\x00-\x1F\x7F]/u', '', (string) $_GET[$key]));
}

function sg_get_int($key, $default = 0) {
    return isset($_GET[$key]) && !is_array($_GET[$key]) ? (int) $_GET[$key] : $default;
}

function sg_is_post() {
    return (isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '') === 'POST';
}

function sg_ip() {
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
}

/* --------------------------------------------------------------------------
   Flash messages
   --------------------------------------------------------------------------
   Every write in the panel finishes with sg_redirect() rather than by printing
   a page, so a refresh cannot re-post the form. The message the user needs to
   see therefore has to survive one redirect, which is what these two do.
   -------------------------------------------------------------------------- */

function sg_flash($kind, $message) {
    if (!isset($_SESSION['sg_flash'])) $_SESSION['sg_flash'] = array();
    $_SESSION['sg_flash'][] = array('kind' => $kind, 'msg' => $message);
}

function sg_take_flash() {
    $f = isset($_SESSION['sg_flash']) ? $_SESSION['sg_flash'] : array();
    unset($_SESSION['sg_flash']);
    return $f;
}

function sg_redirect($to) {
    header('Location: ' . $to);
    exit;
}

/* --------------------------------------------------------------------------
   Text
   -------------------------------------------------------------------------- */

/* The two or three letters printed in the corner of a testimonial card. Taken
   from the name when nobody has typed one: "NYK Ship Management" gives NYK,
   "Keiji Tomoda" gives KT. */
function sg_initials($name, $max = 3) {
    $name = trim(preg_replace('/[^\p{L}\p{N} ]+/u', ' ', (string) $name));
    if ($name === '') return '--';

    $words = preg_split('/\s+/u', $name, -1, PREG_SPLIT_NO_EMPTY);

    /* an all-caps first word is already an acronym — keep it whole */
    if (count($words) > 1 && preg_match('/^\p{Lu}{2,4}$/u', $words[0])) {
        return mb_substr($words[0], 0, 4, 'UTF-8');
    }

    $out = '';
    foreach ($words as $w) {
        $out .= mb_strtoupper(mb_substr($w, 0, 1, 'UTF-8'), 'UTF-8');
        if (mb_strlen($out, 'UTF-8') >= $max) break;
    }
    return $out !== '' ? $out : '--';
}

/* The caption a batch-uploaded photograph starts with. "yard-front_02.JPG"
   becomes "Yard Front 02" — wrong often enough that it is offered as a
   starting point to edit, right often enough to beat an empty field. A name
   that carries no words ("IMG_4471") gives nothing, and the caller falls back
   to a numbered placeholder. */
function sg_title_from_filename($filename) {
    $base = pathinfo((string) $filename, PATHINFO_FILENAME);
    $base = preg_replace('/[_\-]+/u', ' ', $base);
    $base = preg_replace('/\s+/u', ' ', trim($base));

    if ($base === '') return '';
    if (preg_match('/^(img|dsc|dscn|photo|image|pxl|screenshot)[\s\d]*$/iu', $base)) return '';

    return mb_convert_case(mb_substr($base, 0, 90, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
}

function sg_excerpt($text, $len = 160) {
    $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $text)));
    if (mb_strlen($text, 'UTF-8') <= $len) return $text;
    $cut = mb_substr($text, 0, $len, 'UTF-8');
    $sp  = mb_strrpos($cut, ' ', 0, 'UTF-8');
    if ($sp > $len * 0.6) $cut = mb_substr($cut, 0, $sp, 'UTF-8');
    return rtrim($cut, " ,.;:—-") . '…';
}

/* "2026-09-05" -> "05 Sep 2026". Anything unparseable comes back as given
   rather than as 01 Jan 1970. */
function sg_date($ymd, $format = 'd M Y') {
    $ymd = trim((string) $ymd);
    if ($ymd === '') return '';
    $ts = strtotime($ymd);
    return $ts ? date($format, $ts) : $ymd;
}

/* --------------------------------------------------------------------------
   Image uploads
   --------------------------------------------------------------------------
   Three separate checks, because each one alone is bypassable:

     1. the extension       — decides what Apache will run the file as
     2. getimagesize()      — decides whether it is really an image
     3. a generated name    — so nothing the uploader typed reaches the disk

   (2) is the load-bearing one. A .php renamed to .jpg passes an extension
   check and is harmless until something serves it as PHP; getimagesize()
   refuses it outright because it has no image header. The extension written
   to disk is then derived from what getimagesize() FOUND, not from what the
   file was called, so a GIF uploaded as "x.jpg" is stored as .gif.

   uploads/.htaccess is the belt to this pair of braces: even a file that got
   through all three cannot execute there.
   -------------------------------------------------------------------------- */

function sg_upload_image($field, $subdir, &$error) {
    $error = '';

    /* NO ENTRY IN $_FILES MEANS "NOTHING WAS CHOSEN", NOT "SOMETHING FAILED".

       This used to set a real error here, and it made every picture on every
       form effectively mandatory. A browser submitting a multipart form sends
       an empty part for a file input the user left alone, so $_FILES[$field]
       exists with UPLOAD_ERR_NO_FILE and the callers' "no-file" branch caught
       it — which is why the forms worked when driven by hand. The key is
       absent entirely whenever the request is NOT multipart: an
       application/x-www-form-urlencoded post, a form whose enctype is wrong or
       missing, or a client that omits empty parts. Those all arrived here as
       "No file was received." and came out the other side as a validation
       error refusing to save an article whose picture is optional.

       Both cases mean the same thing to every caller, so both return the same
       'no-file' sentinel. */
    if (!isset($_FILES[$field]) || !is_array($_FILES[$field])) {
        $error = 'no-file';
        return '';
    }

    return sg_store_upload($_FILES[$field], $subdir, $error);
}

/* A <input type="file" multiple> arrives as ONE $_FILES entry whose every
   value is an array — name[0], name[1], tmp_name[0] and so on — rather than
   as one entry per file. This turns that inside out into the shape the single
   uploader expects, and stores each one.

   Returns array('saved' => array of paths, 'errors' => array of messages), so
   a batch where two of six pictures were rejected still saves the four that
   were fine and reports the two by name. */
function sg_upload_images($field, $subdir) {
    $out = array('saved' => array(), 'errors' => array());

    if (!isset($_FILES[$field]) || !is_array($_FILES[$field])
        || !isset($_FILES[$field]['name'])) {
        return $out;
    }

    $f     = $_FILES[$field];
    $names = (array) $f['name'];

    foreach (array_keys($names) as $i) {
        $one = array(
            'name'     => isset($f['name'][$i])     ? $f['name'][$i]     : '',
            'type'     => isset($f['type'][$i])     ? $f['type'][$i]     : '',
            'tmp_name' => isset($f['tmp_name'][$i]) ? $f['tmp_name'][$i] : '',
            'error'    => isset($f['error'][$i])    ? $f['error'][$i]    : UPLOAD_ERR_NO_FILE,
            'size'     => isset($f['size'][$i])     ? $f['size'][$i]     : 0,
        );

        if ($one['error'] === UPLOAD_ERR_NO_FILE) continue;

        $err  = '';
        $path = sg_store_upload($one, $subdir, $err);

        if ($path !== '') {
            $out['saved'][] = array('path' => $path, 'name' => (string) $one['name']);
        } elseif ($err !== '' && $err !== 'no-file') {
            $label = $one['name'] !== '' ? '“' . $one['name'] . '”' : 'One file';
            $out['errors'][] = $label . ': ' . $err;
        }
    }

    return $out;
}

function sg_store_upload(array $f, $subdir, &$error) {
    $error = '';

    if (isset($f['error']) && $f['error'] === UPLOAD_ERR_NO_FILE) {
        $error = 'no-file';          /* caller decides whether that is fatal */
        return '';
    }

    if (!isset($f['error']) || $f['error'] !== UPLOAD_ERR_OK) {
        $map = array(
            UPLOAD_ERR_INI_SIZE   => 'The file is larger than this server allows (upload_max_filesize in php.ini).',
            UPLOAD_ERR_FORM_SIZE  => 'The file is larger than the form allows.',
            UPLOAD_ERR_PARTIAL    => 'The upload was interrupted. Please try again.',
            UPLOAD_ERR_NO_TMP_DIR => 'The server has no temporary folder to receive uploads.',
            UPLOAD_ERR_CANT_WRITE => 'The server could not write the uploaded file to disk.',
            UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the upload.',
        );
        $error = isset($map[$f['error']]) ? $map[$f['error']] : 'The upload failed.';
        return '';
    }

    /* the file has to have arrived through PHP's upload machinery, not be an
       arbitrary path somebody put in the request */
    if (!is_uploaded_file($f['tmp_name'])) {
        $error = 'The upload failed a security check.';
        return '';
    }

    $max = (int) sg_config('max_upload', 4194304);
    if ($f['size'] > $max) {
        $error = 'The image is ' . sg_bytes($f['size']) . '. The limit is ' . sg_bytes($max) . '.';
        return '';
    }

    /* --- is it actually an image? --- */
    $info = @getimagesize($f['tmp_name']);
    if (!$info || empty($info[0]) || empty($info[1])) {
        $error = 'That file is not an image the server can read.';
        return '';
    }

    $byType = array(
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG  => 'png',
        IMAGETYPE_GIF  => 'gif',
        IMAGETYPE_WEBP => 'webp',
    );
    $type = isset($info[2]) ? $info[2] : 0;

    if (!isset($byType[$type])) {
        $error = 'Please upload a JPG, PNG, WebP or GIF.';
        return '';
    }

    $ext     = $byType[$type];
    $allowed = (array) sg_config('image_types', array('jpg', 'jpeg', 'png', 'webp', 'gif'));
    if (!in_array($ext, $allowed, true)) {
        $error = 'Images of that type are not allowed here.';
        return '';
    }

    /* --- where it goes --- */
    $rel = trim((string) sg_config('upload_dir', 'uploads'), '/') . '/' . trim($subdir, '/');
    $abs = sg_root() . '/' . $rel;

    if (!is_dir($abs) && !@mkdir($abs, 0775, true)) {
        $error = 'Could not create the folder ' . $rel . '. Give it write permission.';
        return '';
    }
    if (!is_writable($abs)) {
        $error = 'The folder ' . $rel . ' is not writable. Give it write permission (755 or 775).';
        return '';
    }

    /* A name built here, never the one that was uploaded: the original may
       contain a path, a second extension, or characters the filesystem or the
       URL will read differently from the way this code did. */
    $name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;

    if (!@move_uploaded_file($f['tmp_name'], $abs . '/' . $name)) {
        $error = 'Could not save the image into ' . $rel . '.';
        return '';
    }
    @chmod($abs . '/' . $name, 0644);

    return $rel . '/' . $name;      /* site-root-relative, usable as a src */
}

/* Deleting the picture when its row goes. Confined to the upload folder on
   purpose: image columns can also hold a hand-written path such as
   images/gallery/1.jpg, and those files belong to the site, not to the panel. */
function sg_delete_upload($relPath) {
    $relPath = ltrim((string) $relPath, '/');
    $base    = trim((string) sg_config('upload_dir', 'uploads'), '/') . '/';

    if ($relPath === '' || strpos($relPath, $base) !== 0) return false;
    if (strpos($relPath, '..') !== false) return false;

    $abs = sg_root() . '/' . $relPath;
    return is_file($abs) ? @unlink($abs) : false;
}

function sg_bytes($n) {
    $n = (float) $n;
    if ($n >= 1048576) return round($n / 1048576, 1) . ' MB';
    if ($n >= 1024)    return round($n / 1024) . ' KB';
    return (int) $n . ' B';
}

/* The largest upload PHP will actually accept, whatever the config asks for.
   Printed under the file inputs so nobody discovers the real ceiling by
   hitting it with a 6 MB photograph. */
function sg_effective_max_upload() {
    $toBytes = function ($v) {
        $v = trim((string) $v);
        if ($v === '') return 0;
        $unit = strtolower(substr($v, -1));
        $num  = (float) $v;
        if ($unit === 'g') return (int) ($num * 1073741824);
        if ($unit === 'm') return (int) ($num * 1048576);
        if ($unit === 'k') return (int) ($num * 1024);
        return (int) $num;
    };

    $limits = array((int) sg_config('max_upload', 4194304));
    foreach (array('upload_max_filesize', 'post_max_size') as $k) {
        $b = $toBytes(ini_get($k));
        if ($b > 0) $limits[] = $b;
    }
    return min($limits);
}
