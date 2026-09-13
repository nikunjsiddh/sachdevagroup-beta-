<?php
/* ==========================================================================
   ADMIN — republish everything
   ==========================================================================
   Saving anything already rewrites the page it belongs to, so this button is
   not part of the normal loop. It is here for the three times it is needed:
   after the marker comments have been put back into a page by hand, after the
   .html files have been replaced by a deployment, and to prove the panel can
   write to them at all.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';
sg_require_login();

if (!sg_is_post()) sg_redirect('dashboard.php');
sg_csrf_check();

list($ok, $messages) = sg_publish_all();

sg_flash($ok ? 'ok' : 'error',
    ($ok ? 'Republished. ' : 'Some pages could not be written. ')
    . implode(' ', $messages));

/* back where the button was pressed, if that was one of our own pages */
$from = isset($_SERVER['HTTP_REFERER']) ? (string) $_SERVER['HTTP_REFERER'] : '';
$page = basename((string) parse_url($from, PHP_URL_PATH));

$allowed = array('dashboard.php', 'news.php', 'gallery.php', 'certificates.php',
                 'testimonials.php', 'complaints.php', 'users.php');
sg_redirect(in_array($page, $allowed, true) ? $page : 'dashboard.php');
