<?php
/* ==========================================================================
   FEEDBACK — receive the form, mail it out
   ==========================================================================
   Posted to by js/feedback.js. Returns JSON: {ok:true} or {ok:false,error:"…"}.

   The credentials live in mail-config.php, which .gitignore excludes. Copy
   mail-config.sample.php over it and fill that copy in — never this file.

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

/* --- 1. only a POST from this site ------------------------------------- */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Method not allowed.', 405);
}

/* A form posted from another origin is either a mistake or someone using this
   endpoint as a free mailer. Compare hosts, not full URLs: the site is served
   from localhost in development and a domain in production, and hard-coding
   either one breaks the other. */
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$originHost = $origin ? (string) parse_url($origin, PHP_URL_HOST) : '';

/* HTTP_HOST carries the port whenever it is not 80 or 443, and parse_url's
   host never does — so "localhost" from the Origin header would not match
   "localhost:8080" from HTTP_HOST, and every post would be rejected on any
   XAMPP moved off port 80. Compare hosts only. */
$hostOnly = preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));

if (!$originHost || strcasecmp($originHost, $hostOnly) !== 0) {
    fail('Request blocked.', 403);
}

/* --- 2. config ---------------------------------------------------------- */

/* Whether the person posting is at the machine running the server. It decides
   how much a failure is allowed to say: a visitor gets "not configured" and
   nothing else, while whoever is setting the site up on localhost is told
   which file is missing and what to do about it. Setup instructions on a
   public endpoint are a description of the server to anybody probing it. */
$devHost = in_array($_SERVER['REMOTE_ADDR'] ?? '', array('127.0.0.1', '::1'), true);

$configFile = __DIR__ . '/mail-config.php';

/* A missing or unfinished mail config is NOT reported here any more.
   It used to be, and that meant an unconfigured server threw the visitor's
   note away: this ran before the validation and before the note was recorded,
   so a site whose mail was not set up yet lost every message sent to it
   instead of at least keeping one for the admin panel to show.

   The failure is deferred to section 4c instead — after the note has been
   written to the database — so the office still has it either way. Everything
   about what the visitor is told, and what only a local setup is told, is
   unchanged; it just happens a few lines later. */
$mailFail = '';
$cfg = array();

if (!is_file($configFile)) {
    /* This is the one setup step that cannot be shipped, and it catches
       everyone who deploys with git: mail-config.php is in .gitignore because
       it holds a live password, so a pull brings feedback-send.php and the
       sample but never the real file. */
    error_log('feedback: mail-config.php is missing — copy mail-config.sample.php to '
        . 'mail-config.php in ' . __DIR__ . ' and fill in the Gmail address and app password');

    $mailFail = 'Mail is not configured on this server.' . ($devHost
        ? ' Copy mail-config.sample.php to mail-config.php in the site folder and'
          . ' fill in the Gmail address and app password — .gitignore keeps that'
          . ' file out of the repository, so git never delivers it.'
        : '');
} else {
    $cfg = require $configFile;

    /* A config that is present but still holds the sample values fails at AUTH
       with nothing to explain it. Say so here instead. */
    if (!is_array($cfg) || empty($cfg['user']) || empty($cfg['pass'])
            || strpos((string) $cfg['user'], 'you@') === 0
            || strpos((string) $cfg['pass'], 'xxxx') === 0) {
        error_log('feedback: mail-config.php still holds the sample values');
        $mailFail = 'Mail is not configured on this server.' . ($devHost
            ? ' mail-config.php is still filled with the sample placeholders.' : '');
        $cfg = is_array($cfg) ? $cfg : array();
    }
}

/* --- 3. the fields, re-checked ------------------------------------------ */

function field($k, $max) {
    $v = isset($_POST[$k]) ? trim((string) $_POST[$k]) : '';
    /* strip control characters, CR and LF included. Nothing here is ever put
       in a header, but a newline in a value has no legitimate use either. */
    $v = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v);
    return mb_substr($v, 0, $max);
}

$type = field('feedbackType', 20);
$name = field('name', 60);
$role = field('designation', 60);
$tel  = field('mobile', 18);
$note = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '',
        (string) ($_POST['note'] ?? '')));           /* newlines survive here */
$note = mb_substr($note, 0, 500);

$allowedTypes = array('Workers', 'Visitors', 'Customers');
if (!in_array($type, $allowedTypes, true))  fail('Please choose who this feedback is from.');
if (mb_strlen($name) < 2)                   fail('Please enter your name.');
if (!preg_match('/^[\p{L}\p{M} .\'\-]+$/u', $name))
                                            fail('Name may contain letters, spaces, . \' and - only.');
if (mb_strlen($role) < 2)                   fail('Please enter your designation.');
if (mb_strlen($note) < 5)                   fail('Please write your feedback.');

/* the same rule js/feedback.js applies: a country prefix comes off only when
   there is more than ten digits to take it from, so a real ten-digit number
   in the 91 series is not mangled into eight */
$digits = preg_replace('/[^0-9+]/', '', $tel);
$digits = ltrim($digits, '+');
if (strlen($digits) > 10) $digits = preg_replace('/^(0091|091|91|0)/', '', $digits);
if (!preg_match('/^[6-9][0-9]{9}$/', $digits)) fail('Enter a valid 10-digit mobile number.');

/* --- 4. one IP may not use this as a mailer ----------------------------- */

$limit = (int) ($cfg['limit_per_hour'] ?? 5);
$ip    = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$now   = time();

/* Shared hosting is where this used to quietly stop working. The counter went
   into sys_get_temp_dir() with an @ on the write, so on any host where that
   directory is not writable — open_basedir, a locked-down tmp, a read-only
   container — the write failed, nothing was recorded, and the endpoint served
   unlimited sends while looking exactly like a working rate limit.

   Now the directory is chosen by testing it, the site folder is the fallback,
   and a host where neither works says so in the error log instead of pretending.
   It still fails open: a form that refuses everyone because a counter file
   cannot be written is worse than one that is briefly unthrottled. */
$dir = '';
foreach (array(sys_get_temp_dir(), __DIR__) as $cand) {
    if ($cand && is_dir($cand) && is_writable($cand)) { $dir = $cand; break; }
}

if ($dir === '') {
    error_log('feedback: no writable directory for the throttle — RATE LIMITING IS OFF');
} else {
    /* one file for every caller rather than one per IP: a busy site leaves
       thousands of files in tmp otherwise, and nothing ever cleans them up */
    $store = $dir . '/.sgfb-throttle.json';
    $all   = is_file($store) ? (array) json_decode((string) file_get_contents($store), true) : array();
    $key   = sha1($ip);

    /* drop every caller whose last hour has expired, so the file self-trims */
    foreach ($all as $k => $times) {
        $kept = array_values(array_filter((array) $times, function ($t) use ($now) {
            return $t > $now - 3600;
        }));
        if ($kept) $all[$k] = $kept; else unset($all[$k]);
    }

    $hits = isset($all[$key]) ? (array) $all[$key] : array();
    if (count($hits) >= $limit) {
        fail('Too many messages from this connection. Please try again later.', 429);
    }

    $hits[] = $now;
    $all[$key] = $hits;

    if (@file_put_contents($store, json_encode($all), LOCK_EX) === false) {
        error_log('feedback: could not write ' . $store . ' — rate limiting is OFF');
    }
}

/* --- 4b. write it into the complaints book -------------------------------
   Recorded BEFORE the mail is attempted, deliberately. Sending is the step
   that fails — a wrong app password, a host blocking outbound SMTP, Gmail
   throttling — and until this existed a failure there meant the note was gone
   with nothing but a line in the error log to say it had ever arrived.

   It lands in sg_complaints, which is correspondence and is never published.
   A note somebody decides is worth printing is copied across to the
   testimonials by hand in /admin; nothing a stranger types reaches the About
   page on its own.

   Wrapped, and deliberately non-fatal: this is an addition to a form that
   worked before there was a database, and a locked SQLite file or a MySQL
   that is down must not stop a visitor's message reaching the office. What it
   sets is $stored, which is what section 4c then depends on.
   ---------------------------------------------------------------------- */

$stored = false;

try {
    require_once __DIR__ . '/includes/db.php';
    require_once __DIR__ . '/includes/helpers.php';

    sg_run('INSERT INTO sg_complaints
            (feedback_type, name, designation, mobile, note, status, source, ip,
             submitted_at, handled_at, handled_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        array($type, $name, $role, '+91 ' . $digits, $note,
              'new', 'website', $ip, date('Y-m-d H:i:s'), '', ''));

    $stored = true;

} catch (Throwable $ex) {
    error_log('feedback: could not record the note for the admin panel — '
        . $ex->getMessage() . ' (the email is still being sent)');
}

/* --- 4c. mail is a second copy now, not the only one ---------------------
   THE VISITOR IS NOT TOLD A MESSAGE FAILED THAT DID NOT FAIL.

   This used to fail() the moment the mail config was missing, and it did so
   AFTER the note had already been written to the database. The office had the
   message, the panel was showing it, and the person who sent it was reading a
   red box telling them to copy mail-config.sample.php — the site's internal
   setup, in front of a visitor, about a delivery that had actually happened.

   There are two destinations and the send succeeds if either one does. Where
   the note is stored, mail is a convenience: log the problem for whoever runs
   the server and tell the visitor the truth, which is that their feedback has
   reached the office. Only a note that reached NEITHER is a failure, and that
   one still says so.
   ---------------------------------------------------------------------- */

/* Said instead of "sent" whenever the mail did not go out. Kept in one place
   because both the config failure below and the SMTP failure at the end of
   this file need exactly the same sentence. */
function delivered_to_panel_only($devHost, $why) {
    error_log('feedback: ' . $why . ' — the note is in the admin panel, so the '
        . 'visitor was told it arrived rather than that it failed');

    echo json_encode(array(
        'ok'      => true,
        'message' => 'Your feedback has reached the Sachdeva Group office and is '
                   . 'waiting there to be read. We will be in touch if a reply is needed.'
                   /* Only on the machine running the server: the visitor has no
                      use for it and it describes the mail setup. */
                   . ($devHost ? ' (Mail is not configured on this server, so no email '
                               . 'was sent — the note was recorded in /admin instead.)' : ''),
    ));
    exit;
}

if ($mailFail !== '') {
    if ($stored) {
        delivered_to_panel_only($devHost, 'mail is not configured');
    }
    /* Nowhere to put it and no way to send it. Now it is a failure. */
    fail($mailFail, 500);
}

/* --- 5. the message ------------------------------------------------------ */

require __DIR__ . '/feedback-template.php';

$sentAt = date('j M Y, g:i a');
$html   = sgfb_email_html($type, $name, $role, '+91 ' . $digits, $note, $sentAt);
$text   = sgfb_email_text($type, $name, $role, '+91 ' . $digits, $note, $sentAt);

/* --- 6. send ------------------------------------------------------------- */

function smtp_send($cfg, $subject, $html, $text) {
    $user = (string) $cfg['user'];
    $pass = str_replace(' ', '', (string) $cfg['pass']);   /* Google prints it in fours */
    $to   = (string) $cfg['to'];
    $host = $cfg['host'] ?? 'smtp.gmail.com';
    $port = (int) ($cfg['port'] ?? 465);

    /* 'secure' exists so a local test relay (MailHog, Papercut, smtp4dev on
       127.0.0.1) can be pointed at without TLS. It is guarded rather than
       trusted: turning it off for anything but a loopback host would put the
       app password on the wire in clear, so that combination is refused
       outright instead of being left to whoever edits the config. */
    $secure = ($cfg['secure'] ?? 'ssl') !== '';
    $local  = in_array($host, array('127.0.0.1', 'localhost', '::1'), true);

    if (!$secure && !$local) {
        error_log('feedback: refusing to send to ' . $host . ' without TLS');
        return 'insecure';
    }

    if ($secure && !extension_loaded('openssl')) {
        error_log('feedback: the openssl extension is off; enable it in php.ini');
        return 'openssl';
    }

    $scheme = $secure ? 'ssl' : 'tcp';
    $fp = @stream_socket_client("$scheme://$host:$port", $errno, $errstr, 20);
    if (!$fp) {
        /* On shared hosting this is almost always the host firewalling
           outbound SMTP rather than anything wrong here — a lot of providers
           block 25/465/587 to everything but their own mail server. Say so in
           the log, because "connect failed" on its own sends people looking
           at the password. */
        error_log('feedback: could not reach ' . $host . ':' . $port . ' — ' . $errno . ' ' . $errstr
            . '. If this is a live shared host, check whether it allows outbound SMTP on that port;'
            . ' many block it and require their own relay instead.');
        return 'connect';
    }
    stream_set_timeout($fp, 20);

    /* SMTP replies can run to several lines; only the one with a space in the
       fourth column is the last. Reading a single line reads AUTH and EHLO
       wrong every time. */
    $read = function () use ($fp) {
        $out = '';
        while (($line = fgets($fp, 1024)) !== false) {
            $out .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') break;
        }
        return $out;
    };
    $say = function ($cmd) use ($fp, $read) { fwrite($fp, $cmd . "\r\n"); return $read(); };
    $ok  = function ($reply, $code) { return strncmp($reply, (string) $code, 3) === 0; };

    $step = 'greeting';
    do {
        if (!$ok($read(), 220)) break;
        $step = 'ehlo';   if (!$ok($say('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost')), 250)) break;
        $step = 'auth';   if (!$ok($say('AUTH LOGIN'), 334)) break;
        $step = 'user';   if (!$ok($say(base64_encode($user)), 334)) break;
        $step = 'pass';   if (!$ok($say(base64_encode($pass)), 235)) break;
        $step = 'from';   if (!$ok($say('MAIL FROM:<' . $user . '>'), 250)) break;
        $step = 'rcpt';   if (!$ok($say('RCPT TO:<' . $to . '>'), 250)) break;
        $step = 'data';   if (!$ok($say('DATA'), 354)) break;

        $b = '=_sgfb_' . bin2hex(random_bytes(8));
        $fromName = preg_replace('/[^\x20-\x7E]/', '', (string) ($cfg['from_name'] ?? 'Website'));
        $headers = array(
            'From: "' . $fromName . '" <' . $user . '>',
            'To: <' . $to . '>',
            'Subject: ' . $subject,
            'Date: ' . date('r'),
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $b . '"'
        );
        $body = implode("\r\n", $headers) . "\r\n\r\n"
              . "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\n"
              . "Content-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "\r\n"
              . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\n"
              . "Content-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "\r\n"
              . "--$b--\r\n";

        /* a line that is a single dot ends DATA — double any leading dot */
        $body = preg_replace('/^\./m', '..', $body);

        fwrite($fp, $body . "\r\n.\r\n");
        $step = 'send';   if (!$ok($read(), 250)) break;
        $step = '';
    } while (false);

    @fwrite($fp, "QUIT\r\n");
    @fclose($fp);

    if ($step !== '') { error_log('feedback: SMTP failed at step "' . $step . '"'); return $step; }
    return true;
}

$subject = 'Website feedback — ' . $type . ' — ' . $name;
$result  = smtp_send($cfg, $subject, $html, $text);

if ($result !== true) {
    /* Same rule as section 4c: the note is already in the panel, so a mail
       that would not go out is the office's problem and not the visitor's.
       Which SMTP step failed, and whether the password was rejected, belongs
       in the server log — it is a map of the mail setup to anybody probing
       this endpoint, and it is nothing a visitor can act on. */
    if ($stored) {
        delivered_to_panel_only($devHost, 'SMTP failed at step "' . $result . '"');
    }
    fail('Could not send just now. Please call or email us instead.', 502);
}

echo json_encode(array('ok' => true));
