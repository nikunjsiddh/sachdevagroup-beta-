<?php
/* ==========================================================================
   AUTHENTICATION
   ==========================================================================
   The session, the sign-in, the CSRF token and the throttle.

   Passwords are stored only as a password_hash() digest — PASSWORD_DEFAULT,
   so the algorithm improves with PHP without this file changing. Nothing here
   can tell you what a password is, which is the point; a lost one is reset,
   never recovered.
   ========================================================================== */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

/* --------------------------------------------------------------------------
   Session
   -------------------------------------------------------------------------- */

function sg_session_start() {
    if (session_status() === PHP_SESSION_ACTIVE) return;

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
          || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443)
          || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    session_name((string) sg_config('session_name', 'SGADMIN'));

    /* httponly puts the cookie out of reach of any script on the page, and
       samesite=Lax means a form posted from another site arrives with no
       session at all — which is the CSRF defence that does not depend on
       anybody remembering to check a token. The token below is still there
       because Lax does not cover every browser this site still sees. */
    $params = array(
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => $https,
    );
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params($params);
    } else {
        session_set_cookie_params(0, '/; samesite=Lax', '', $https, true);
    }

    session_start();

    /* Idle timeout. Checked here rather than in a page so it applies to every
       entry point, including the POST handlers. */
    $idle = (int) sg_config('session_idle', 7200);
    if ($idle > 0 && isset($_SESSION['sg_seen']) && (time() - (int) $_SESSION['sg_seen']) > $idle) {
        /* sg_logout() leaves a fresh empty session behind, so the message
           below has somewhere to live and the sign-in page it lands on can
           still issue a CSRF token. */
        sg_logout();
        sg_flash('warn', 'You were signed out after a period of inactivity.');
        return;
    }
    $_SESSION['sg_seen'] = time();
}

/* --------------------------------------------------------------------------
   CSRF
   -------------------------------------------------------------------------- */

function sg_csrf_token() {
    if (empty($_SESSION['sg_csrf'])) {
        $_SESSION['sg_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['sg_csrf'];
}

function sg_csrf_field() {
    return '<input type="hidden" name="_token" value="' . e(sg_csrf_token()) . '">';
}

/* Every POST in the panel calls this first. hash_equals rather than === so the
   comparison does not leak the token one byte at a time through its timing. */
function sg_csrf_check() {
    $sent = isset($_POST['_token']) && !is_array($_POST['_token']) ? (string) $_POST['_token'] : '';
    $have = isset($_SESSION['sg_csrf']) ? (string) $_SESSION['sg_csrf'] : '';

    if ($have === '' || $sent === '' || !hash_equals($have, $sent)) {
        http_response_code(400);
        echo '<!doctype html><meta charset="utf-8">'
           . '<title>Session expired</title>'
           . '<body style="font:16px/1.6 system-ui,sans-serif;max-width:34em;margin:14vh auto;padding:0 6vw;color:#0d2135">'
           . '<h1 style="font-size:22px">That form has expired</h1>'
           . '<p>Your sign-in timed out, or the page had been open a long time. '
           . 'Nothing was saved.</p>'
           . '<p><a href="index.php" style="color:#0d6a94">Sign in again</a></p>';
        exit;
    }
}

/* --------------------------------------------------------------------------
   Who is signed in
   -------------------------------------------------------------------------- */

function sg_user() {
    static $cached = null;
    static $looked = false;

    if ($looked) return $cached;
    $looked = true;

    if (empty($_SESSION['sg_uid'])) return null;

    $u = sg_one('SELECT * FROM sg_users WHERE id = ?', array((int) $_SESSION['sg_uid']));

    /* A row that has been deleted or deactivated since sign-in must not keep
       working until the session happens to expire. */
    if (!$u || (int) $u['is_active'] !== 1) {
        sg_logout();
        return null;
    }

    $cached = $u;
    return $cached;
}

function sg_is_owner() {
    $u = sg_user();
    return $u && $u['role'] === 'owner';
}

/* Every page but the sign-in screen starts with this. */
function sg_require_login() {
    if (sg_user()) return;

    /* Come back to where they were headed once they have signed in.

       ONLY THE FILENAME is carried, never a path and never the query string.
       A full URL here would be an open redirect — "sign in and you will be
       returned to <anywhere>" is exactly the shape of a phishing link, and it
       would be on the one page of this site where somebody is about to type a
       password. index.php re-checks what comes back as well; this is the
       first of the two, not the only one.

       The cost is that news.php?action=edit&id=5 returns to the news list
       rather than to that article. Being sent one click short of where you
       were is a smaller problem than the redirect. */
    $path = (string) parse_url(
        isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '',
        PHP_URL_PATH);
    $file = basename($path);

    $to = 'index.php';
    if (preg_match('/^[a-z0-9_\-]+\.php$/i', $file) && $file !== 'index.php') {
        $to .= '?next=' . rawurlencode($file);
    }
    sg_redirect($to);
}

function sg_require_owner() {
    sg_require_login();
    if (sg_is_owner()) return;
    sg_flash('error', 'Only an owner account can manage administrators.');
    sg_redirect('dashboard.php');
}

/* --------------------------------------------------------------------------
   Signing in
   -------------------------------------------------------------------------- */

function sg_login_attempts($ip) {
    $window = (int) sg_config('login_window', 900);
    return (int) sg_val(
        'SELECT COUNT(*) FROM sg_login_log WHERE ip = ? AND at > ?',
        array($ip, time() - $window), 0);
}

function sg_login_locked($ip) {
    return sg_login_attempts($ip) >= (int) sg_config('login_max_tries', 6);
}

function sg_login_note_failure($ip, $username) {
    sg_run('INSERT INTO sg_login_log (ip, username, at) VALUES (?, ?, ?)',
        array($ip, mb_substr($username, 0, 60), time()));

    /* keep the table from growing without bound */
    sg_run('DELETE FROM sg_login_log WHERE at < ?', array(time() - 86400));
}

/* Returns true, or an error string fit to show the person typing. */
function sg_login($username, $password) {
    $ip = sg_ip();

    if (sg_login_locked($ip)) {
        return 'Too many failed attempts. Try again in '
             . max(1, (int) round(sg_config('login_window', 900) / 60)) . ' minutes.';
    }

    $u = sg_one('SELECT * FROM sg_users WHERE username = ?', array($username));

    /* The hash is verified even when there is no such user, against a dummy
       of the same cost. Skipping it returns "no such user" measurably faster
       than "wrong password", which is how a username list gets built. */
    $hash = $u ? $u['password_hash']
               : '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30M1MlGZlie.';

    $ok = password_verify($password, $hash);

    if (!$u || !$ok || (int) $u['is_active'] !== 1) {
        sg_login_note_failure($ip, $username);

        /* One message for all three cases. "That account is disabled" would
           confirm the username exists to anyone guessing. */
        $left = (int) sg_config('login_max_tries', 6) - sg_login_attempts($ip);
        return 'Wrong username or password.' . ($left > 0 && $left <= 3
            ? ' ' . $left . ' ' . ($left === 1 ? 'attempt' : 'attempts') . ' left.' : '');
    }

    /* The password is right but the stored digest was made by an older PHP or
       a lower cost — quietly restore it to today's default. */
    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        sg_run('UPDATE sg_users SET password_hash = ? WHERE id = ?',
            array(password_hash($password, PASSWORD_DEFAULT), $u['id']));
    }

    /* A new session id, so a fixed one handed to the browser before sign-in
       is not the one that ends up carrying the sign-in. */
    session_regenerate_id(true);

    $_SESSION['sg_uid']  = (int) $u['id'];
    $_SESSION['sg_seen'] = time();
    unset($_SESSION['sg_csrf']);          /* new session, new token */

    sg_run('UPDATE sg_users SET last_login_at = ? WHERE id = ?',
        array(date('Y-m-d H:i:s'), $u['id']));
    sg_run('DELETE FROM sg_login_log WHERE ip = ?', array($ip));

    return true;
}

/* Ends the signed-in session and LEAVES A WORKING EMPTY ONE in its place.

   That second half is not tidiness, it is the whole fix for a bug that made
   the sign-in page impossible to submit.

   session_destroy() throws the storage away, and every write to $_SESSION
   after it is silently discarded — the array is repopulated in memory and
   never persisted. sg_logout() is not only called from logout.php, though:
   sg_user() calls it the moment a session names an account that has since
   been deleted or deactivated, and sg_session_start() calls it on the idle
   timeout. Both of those happen at the TOP of a request that then goes on to
   render a page. That page prints a CSRF token — into the session that no
   longer exists — so the token the visitor was given was never stored, and
   posting the sign-in form came back "That form has expired". Every time,
   until they reloaded.

   Starting a fresh session here means the rest of the request has somewhere
   to put the token and the "you were signed out" message. session_regenerate_id
   is what stops the new session reusing the id of the one just destroyed. */
function sg_logout() {
    $_SESSION = array();

    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();

        /* Headers are already sent once a page has begun printing — a new
           cookie cannot be set then, and session_start() would warn. Nothing
           in this panel signs out mid-page, but say so rather than emitting a
           warning into the middle of the markup if something ever does. */
        if (!headers_sent()) {
            session_start();
            session_regenerate_id(true);
            $_SESSION = array();
            $_SESSION['sg_seen'] = time();
        }
    }
}

/* --------------------------------------------------------------------------
   Accounts
   -------------------------------------------------------------------------- */

function sg_user_count() {
    return (int) sg_val('SELECT COUNT(*) FROM sg_users', array(), 0);
}

/* True until the first administrator exists. admin/index.php shows the
   "create the first administrator" form instead of the sign-in while it is. */
function sg_needs_setup() {
    return sg_user_count() === 0;
}

function sg_password_problem($password, $confirm = null) {
    if (mb_strlen($password) < 8)          return 'The password must be at least 8 characters.';
    if (mb_strlen($password) > 200)        return 'That password is too long.';
    if (preg_match('/^\s|\s$/u', $password)) return 'The password cannot start or end with a space.';
    if ($confirm !== null && $password !== $confirm) return 'The two passwords do not match.';
    return '';
}

function sg_username_problem($username, $ignoreId = 0) {
    if (!preg_match('/^[a-zA-Z0-9._-]{3,40}$/', $username)) {
        return 'The username must be 3-40 characters: letters, numbers, dot, dash or underscore.';
    }
    $taken = sg_one('SELECT id FROM sg_users WHERE username = ? AND id <> ?',
        array($username, (int) $ignoreId));
    return $taken ? 'That username is already taken.' : '';
}

function sg_create_user($username, $password, $fullName, $email, $role) {
    $role = $role === 'owner' ? 'owner' : 'editor';

    sg_run('INSERT INTO sg_users
        (username, password_hash, full_name, email, role, is_active, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
        array($username, password_hash($password, PASSWORD_DEFAULT),
              $fullName, $email, $role, date('Y-m-d H:i:s'), ''));

    return (int) sg_db()->lastInsertId();
}
