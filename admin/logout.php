<?php
/* ==========================================================================
   ADMIN — sign out
   ==========================================================================
   POST only, and CSRF-checked. A GET here would mean any <img src="logout.php">
   on any page the administrator visits signs them out — harmless as attacks
   go, but it is also what turns a browser prefetch into a mystery.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';

if (!sg_is_post()) sg_redirect('dashboard.php');

sg_csrf_check();

/* sg_logout() leaves a fresh empty session in place of the one it destroyed,
   which is what lets this message survive the redirect. */
sg_logout();
sg_flash('ok', 'You are signed out.');
sg_redirect('index.php');
