<?php
/* ==========================================================================
   CONTACT — receive the enquiry form, mail it out, acknowledge it
   ==========================================================================
   Posted to by js/contact.js. Returns JSON: {ok:true} or {ok:false,error:"…"}.

   The form on contact_us.html had action="" and a type="button" submit: it
   validated nothing, posted nowhere, and every enquiry typed into it since
   the page went up was discarded on navigation. This is the endpoint behind
   it.

   THREE THINGS HAPPEN, IN THIS ORDER, AND THE ORDER MATTERS
     1. the enquiry is written to the database
     2. the office copy is emailed
     3. the sender is emailed an acknowledgement

   Recording first is what makes the rest optional. Sending is the step that
   fails — a wrong app password, a host blocking outbound SMTP, Gmail
   throttling — and a form that loses the enquiry when the mail server has a
   bad afternoon is worse than one that never emailed at all. With the enquiry
   safely in /admin, a mail failure is the office's problem and not the
   visitor's, and they are told the truth: it arrived.

   The credentials live in mail-config.php, which .gitignore excludes.

   The client validates too. That is for the person filling the form in; it is
   not a check, because anyone can post here directly. Everything below is
   re-validated, and nothing typed by a visitor reaches a mail header.
   ========================================================================== */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(array('ok' => false, 'error' => $msg));
    exit;
}

/* --- 1. only a POST from this site -------------------------------------- */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Method not allowed.', 405);
}

/* A form posted from another origin is either a mistake or someone using this
   endpoint as a free mailer. Compare hosts, not full URLs: the site is served
   from localhost in development and a domain in production, and HTTP_HOST
   carries a port whenever it is not 80 or 443 while parse_url's host never
   does. */
$origin     = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$originHost = $origin ? (string) parse_url($origin, PHP_URL_HOST) : '';
$hostOnly   = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));

if (!$originHost || strcasecmp($originHost, $hostOnly) !== 0) {
    fail('Request blocked.', 403);
}

$devHost = in_array($_SERVER['REMOTE_ADDR'] ?? '', array('127.0.0.1', '::1'), true);

/* --- 2. the fields, re-checked ------------------------------------------ */

function field($k, $max) {
    $v = isset($_POST[$k]) ? trim((string) $_POST[$k]) : '';
    /* strip control characters, CR and LF included. Nothing here is ever put
       in a header, but a newline in a value has no legitimate use either. */
    $v = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v);
    return mb_substr($v, 0, $max);
}

$first = field('fname', 40);
$last  = field('lname', 40);
$email = field('email', 120);
$code  = field('country_code', 6);
$phone = field('phone', 18);

/* newlines survive in the message and only there */
$message = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '',
           (string) ($_POST['message'] ?? '')));
$message = mb_substr($message, 0, 1500);

if (mb_strlen($first) < 2)  fail('Please enter your first name.');
if (!preg_match('/^[\p{L}\p{M} .\'\-]+$/u', $first))
                            fail('First name may contain letters, spaces, . \' and - only.');
if ($last !== '' && !preg_match('/^[\p{L}\p{M} .\'\-]+$/u', $last))
                            fail('Last name may contain letters, spaces, . \' and - only.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))
                            fail('Please enter a valid email address.');
if (mb_strlen($message) < 10) fail('Please tell us a little more — at least 10 characters.');

/* The dialling code comes from a <select> of fixed values; anything else was
   not chosen in the form. Digits only, and a length a real number can be. */
if (!preg_match('/^\+\d{1,4}$/', $code)) $code = '+91';
$digits = preg_replace('/\D/', '', $phone);
if (strlen($digits) < 7 || strlen($digits) > 15) fail('Enter a valid phone number.');

$name = trim($first . ' ' . $last);
$tel  = $code . ' ' . $digits;

/* --- 3. one IP may not use this as a mailer ------------------------------ */

$ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$now = time();

/* Fails OPEN on purpose: a form that refuses everyone because a counter file
   cannot be written is worse than one that is briefly unthrottled. Which of
   the two happened is in the error log either way. */
$dir = '';
foreach (array(sys_get_temp_dir(), __DIR__) as $cand) {
    if ($cand && is_dir($cand) && is_writable($cand)) { $dir = $cand; break; }
}

if ($dir === '') {
    error_log('contact: no writable directory for the throttle — RATE LIMITING IS OFF');
} else {
    $store = $dir . '/.sgct-throttle.json';
    $all   = is_file($store) ? (array) json_decode((string) file_get_contents($store), true) : array();
    $key   = sha1($ip);

    foreach ($all as $k => $times) {
        $kept = array_values(array_filter((array) $times, function ($t) use ($now) {
            return $t > $now - 3600;
        }));
        if ($kept) $all[$k] = $kept; else unset($all[$k]);
    }

    $hits = isset($all[$key]) ? (array) $all[$key] : array();
    if (count($hits) >= 5) {
        fail('Too many messages from this connection. Please try again later.', 429);
    }

    $hits[] = $now;
    $all[$key] = $hits;

    if (@file_put_contents($store, json_encode($all), LOCK_EX) === false) {
        error_log('contact: could not write ' . $store . ' — rate limiting is OFF');
    }
}

/* --- 4. record it before anything can fail ------------------------------- */

/* It lands in sg_complaints, which is the office's correspondence book — the
   same place the feedback form writes to — tagged 'Enquiry' and sourced
   'contact' so the two are told apart in /admin. Nothing there is ever
   published to the website.

   Wrapped and non-fatal: a locked SQLite file must not stop the mail. What it
   sets is $stored, which section 6 depends on. */
$stored = false;

try {
    require_once __DIR__ . '/includes/db.php';
    require_once __DIR__ . '/includes/helpers.php';

    sg_run('INSERT INTO sg_complaints
            (feedback_type, name, designation, email, mobile, note, status, source, ip,
             submitted_at, handled_at, handled_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        array('Enquiry', $name, '', $email, $tel, $message,
              'new', 'contact', $ip, date('Y-m-d H:i:s'), '', ''));

    $stored = true;

} catch (Throwable $ex) {
    error_log('contact: could not record the enquiry for the admin panel — '
        . $ex->getMessage() . ' (the email is still being sent)');
}

/* --- 5. the two messages ------------------------------------------------- */

require_once __DIR__ . '/includes/mailer.php';
require_once __DIR__ . '/includes/mail-templates.php';

list($cfg, $mailFail) = sg_mail_config($devHost);

/* Said instead of "sent" whenever the mail did not go out. The enquiry is in
   the panel, so this is the truth and not a consolation. */
function delivered_to_panel_only($devHost, $why) {
    error_log('contact: ' . $why . ' — the enquiry is in the admin panel, so the '
        . 'visitor was told it arrived rather than that it failed');

    echo json_encode(array(
        'ok'      => true,
        'message' => 'Your enquiry has reached the Sachdeva Group office and is waiting '
                   . 'there to be read. We will be in touch shortly.'
                   /* only on the machine running the server */
                   . ($devHost ? ' (Mail is not configured on this server, so no email '
                               . 'was sent — the enquiry was recorded in /admin instead.)' : ''),
    ));
    exit;
}

if ($mailFail !== '') {
    if ($stored) delivered_to_panel_only($devHost, 'mail is not configured');
    fail($mailFail, 500);
}

$sentAt = date('j M Y, g:i a');

$html = sgm_office_enquiry(array(
    'name' => $name, 'email' => $email, 'phone' => $tel,
    'message' => $message, 'sentAt' => $sentAt,
));
$text = sgm_text_office('New enquiry', array(
    'Name' => $name, 'Email' => $email, 'Phone' => $tel, 'Received' => $sentAt,
), 'Message', $message);

/* --- 6. send both over ONE session --------------------------------------
   The office copy and the acknowledgement go out on a single connection. Two
   calls here meant two TLS handshakes plus two logins, which measured 8-15
   seconds EACH against smtp.gmail.com from this network — the visitor waited
   through both and the browser gave up at its own timeout while the mail was
   still being delivered. See the note at the top of includes/mailer.php.

   The office copy is the one that decides the answer. Whether the sender's
   own copy went out changes nothing about whether the enquiry arrived, so its
   failure is logged and swallowed: telling somebody their enquiry did not
   arrive because our courtesy email bounced would be a lie in the unhelpful
   direction. */

$sent = sg_smtp_send_many($cfg, array(
    array(
        'to'      => $cfg['to'],
        'subject' => 'Website enquiry — ' . $name,
        'html'    => $html,
        'text'    => $text,
        'inline'  => sg_mail_inline(sgm_cids('office')),
        /* reply on the office copy reaches the sender, not the website account */
        'replyTo' => $email,
    ),
    array(
        'to'      => $email,
        'subject' => 'We have your enquiry — Sachdeva Group of Industries',
        'html'    => sgm_ack(array('first' => $first, 'kind' => 'enquiry',
                                   'message' => $message, 'sentAt' => $sentAt)),
        'text'    => sgm_text_ack($first, 'enquiry', $message, $sentAt),
        'inline'  => sg_mail_inline(sgm_cids('ack')),
    ),
));

/* A string back means the connection or the login failed, so neither message
   left. An array means the session opened and each entry is that message's
   own result. */
$office = is_array($sent) ? $sent[0] : $sent;
$ackRes = is_array($sent) && isset($sent[1]) ? $sent[1] : 'aborted';

if ($office !== true) {
    /* Which SMTP step failed belongs in the log — it is a map of the mail
       setup to anybody probing this endpoint, and it is nothing a visitor can
       act on. */
    if ($stored) delivered_to_panel_only($devHost, 'SMTP failed at step "' . $office . '"');
    fail('Could not send just now. Please call or email us instead.', 502);
}

if ($ackRes !== true) {
    error_log('contact: acknowledgement to ' . $email . ' failed at step "' . $ackRes . '"');
}

echo json_encode(array('ok' => true));
