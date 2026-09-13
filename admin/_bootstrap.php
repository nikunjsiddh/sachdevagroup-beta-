<?php
/* ==========================================================================
   ADMIN — bootstrap
   ==========================================================================
   Required first by every file in this folder. Loads the shared code, opens
   the session, and turns a database failure into something readable instead
   of a blank page.
   ========================================================================== */

/* Errors belong in the log, never on the screen: a PDO message carries the
   database path, and on MySQL the user it tried to connect as. */
@ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once dirname(__DIR__) . '/includes/db.php';
require_once dirname(__DIR__) . '/includes/helpers.php';
require_once dirname(__DIR__) . '/includes/auth.php';
require_once dirname(__DIR__) . '/includes/publisher.php';

/* Whoever is setting this up is at the machine running the server; a visitor
   is not. It decides how much a failure is allowed to say — the same rule
   feedback-send.php already applies. */
function sg_is_dev_host() {
    return in_array(sg_ip(), array('127.0.0.1', '::1'), true);
}

function sg_fatal($title, $detail = '') {
    http_response_code(500);
    echo '<!doctype html><meta charset="utf-8"><title>' . e($title) . '</title>'
       . '<body style="font:16px/1.65 system-ui,-apple-system,Segoe UI,sans-serif;'
       . 'max-width:38em;margin:12vh auto;padding:0 6vw;color:#0d2135;background:#eef3f8">'
       . '<h1 style="font-size:23px;margin:0 0 14px">' . e($title) . '</h1>';
    if ($detail !== '' && sg_is_dev_host()) {
        echo '<pre style="white-space:pre-wrap;background:#fff;border-left:3px solid #22b3e6;'
           . 'padding:14px 16px;font:13px/1.6 ui-monospace,Consolas,monospace;color:#22384c">'
           . e($detail) . '</pre>';
    }
    echo '<p style="color:#6b8298;font-size:14px">Sachdeva Group &middot; admin</p>';
    exit;
}

/* The first call to sg_db() is what creates the schema, so it is made here —
   a table that cannot be created should fail on this line with an explanation
   rather than three pages later inside a query. */
try {
    sg_db();
} catch (Throwable $ex) {
    error_log('admin: database unavailable — ' . $ex->getMessage());
    sg_fatal('The database is not available',
        $ex->getMessage()
        . "\n\nSQLite needs the data/ folder to be writable by the web server."
        . "\nTo use MySQL instead, create includes/config.local.php — see the note"
        . "\nat the top of includes/config.php.");
}

sg_session_start();

/* Nothing in the panel may be cached, by the browser or by anything between:
   a back button that re-shows a page from a session that has since been
   signed out is a real way for the next person at the machine to read it. */
header('Cache-Control: no-store, no-cache, must-revalidate, private');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: same-origin');
