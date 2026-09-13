<?php
/* ==========================================================================
   MAILER
   ==========================================================================
   One SMTP transport for every message the site sends: the office copy of an
   enquiry, the office copy of a piece of feedback, and the acknowledgement
   that goes back to the person who wrote in.

   WHY THIS FILE EXISTS
   The SMTP conversation used to live inside feedback-send.php. Adding a
   second form meant either calling into that file or copying 120 lines of
   socket handling into a third one, and a copy is how two senders end up
   disagreeing about TLS. There is one conversation with a mail server here
   and everything else describes what to put in the envelope.

   WHY sg_smtp_send_many() IS THE MAIN ENTRY POINT
   Every submission produces TWO messages — the office copy and the sender's
   acknowledgement — and the obvious build sends each with its own call. That
   was the first build, and it was measurably wrong: a TLS handshake plus AUTH
   against smtp.gmail.com measured 8-15 seconds from this network, so two
   connections put the visitor on a 16-30 second wait and the browser gave up
   at its 25 second timeout while the mail was still going out. The visitor
   saw "that took too long" for an enquiry that had in fact been delivered.

   SMTP is a session protocol and always could carry both: connect and
   authenticate once, then MAIL FROM / RCPT TO / DATA per message. One
   handshake, both messages, half the wait. sg_smtp_send() is kept as a
   one-message wrapper so a caller that only has one thing to say still reads
   simply.

   WHAT IT ADDS OVER THE ORIGINAL
     - any recipient, not just the one in the config
     - Reply-To, so hitting reply on the office copy answers the sender
     - inline images by Content-ID, which is what puts the logo and the icons
       in the message without hotlinking anything

   WHY CONTENT-ID AND NOT A URL
   An <img src="https://sachdevagroup.in/..."> in an email is a request the
   recipient's client makes to this server when it opens the message. Gmail
   proxies it, Outlook blocks it until asked, and on a site being developed at
   localhost it resolves to the recipient's own machine and shows nothing at
   all. A cid: reference points at a part of the message itself, so the logo
   arrives with the mail and renders offline.
   ========================================================================== */

/* --------------------------------------------------------------------------
   The config
   -------------------------------------------------------------------------- */

/* Returns array(config, problem). A problem is a sentence for the visitor —
   never the path, never the account. Whoever is at the machine running the
   server gets the detail; everyone else gets "not configured". */
function sg_mail_config($devHost = false) {
    static $cache = null;
    if ($cache !== null) return $cache;

    $file = dirname(__DIR__) . '/mail-config.php';

    if (!is_file($file)) {
        /* The one setup step that cannot be shipped: mail-config.php is in
           .gitignore because it holds a live password, so a deploy by git
           brings the sample and never the real file. */
        error_log('mail: mail-config.php is missing — copy mail-config.sample.php to '
            . 'mail-config.php in ' . dirname(__DIR__) . ' and fill in the address and app password');

        return $cache = array(array(), 'Mail is not configured on this server.' . ($devHost
            ? ' Copy mail-config.sample.php to mail-config.php in the site folder and'
              . ' fill in the Gmail address and app password — .gitignore keeps that'
              . ' file out of the repository, so git never delivers it.' : ''));
    }

    $cfg = require $file;

    /* Present but still holding the sample values fails at AUTH with nothing
       to explain it. Say so here instead. */
    if (!is_array($cfg) || empty($cfg['user']) || empty($cfg['pass'])
            || strpos((string) $cfg['user'], 'you@') === 0
            || strpos((string) $cfg['pass'], 'xxxx') === 0) {
        error_log('mail: mail-config.php still holds the sample values');
        return $cache = array(is_array($cfg) ? $cfg : array(),
            'Mail is not configured on this server.'
            . ($devHost ? ' mail-config.php is still filled with the sample placeholders.' : ''));
    }

    return $cache = array($cfg, '');
}

/* --------------------------------------------------------------------------
   Inline images
   --------------------------------------------------------------------------
   Each entry is array('cid' => …, 'file' => absolute path). The cid is what
   the template writes as src="cid:…". Anything that cannot be read is dropped
   rather than fataled: a missing icon should cost an icon, not the message.
   -------------------------------------------------------------------------- */

function sg_mail_inline($cids) {
    $dir = dirname(__DIR__) . '/images/mail/';
    $out = array();

    foreach ((array) $cids as $name) {
        $path = $dir . basename($name) . '.png';
        if (is_file($path)) $out[] = array('cid' => 'sg-' . $name, 'file' => $path);
    }
    return $out;
}

/* --------------------------------------------------------------------------
   Sending
   --------------------------------------------------------------------------
   sg_smtp_send_many() takes a list of messages, each an array of:
       to, subject, html, text, inline (optional), replyTo (optional)

   It returns an array with one result per message, in order: true, or a short
   token naming the step that failed for that message. If the CONNECTION or
   the login failed then nothing could be sent at all, and it returns a single
   string token instead of an array — callers test with is_array().

   The tokens are for the log and for the caller's branching. They are never
   shown to a visitor: "auth" tells anybody probing this endpoint that the
   account exists and the password is wrong.
   -------------------------------------------------------------------------- */

function sg_smtp_send($cfg, $to, $subject, $html, $text, $inline = array(), $replyTo = '') {
    $r = sg_smtp_send_many($cfg, array(array(
        'to' => $to, 'subject' => $subject, 'html' => $html,
        'text' => $text, 'inline' => $inline, 'replyTo' => $replyTo,
    )));
    return is_array($r) ? $r[0] : $r;
}

function sg_smtp_send_many($cfg, $messages) {
    $messages = array_values((array) $messages);
    if (!$messages) return array();

    $user = (string) $cfg['user'];
    $pass = str_replace(' ', '', (string) $cfg['pass']);   /* Google prints it in fours */
    $host = isset($cfg['host']) ? $cfg['host'] : 'smtp.gmail.com';
    $port = (int) (isset($cfg['port']) ? $cfg['port'] : 465);

    /* 'secure' exists so a local test relay (MailHog, Papercut, smtp4dev on
       127.0.0.1) can be pointed at without TLS. It is guarded rather than
       trusted: turning it off for anything but a loopback host would put the
       app password on the wire in clear, so that combination is refused
       outright instead of being left to whoever edits the config. */
    $secure = (isset($cfg['secure']) ? $cfg['secure'] : 'ssl') !== '';
    $local  = in_array($host, array('127.0.0.1', 'localhost', '::1'), true);

    if (!$secure && !$local) {
        error_log('mail: refusing to send to ' . $host . ' without TLS');
        return 'insecure';
    }
    if ($secure && !extension_loaded('openssl')) {
        error_log('mail: the openssl extension is off; enable it in php.ini');
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
        error_log('mail: could not reach ' . $host . ':' . $port . ' — ' . $errno . ' ' . $errstr
            . '. If this is a live shared host, check whether it allows outbound SMTP on that port;'
            . ' many block it and require their own relay instead.');
        return 'connect';
    }
    stream_set_timeout($fp, 25);

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

    /* ---- open the session once ---- */
    $step = '';
    do {
        if (!$ok($read(), 220))                                                  { $step = 'greeting'; break; }
        if (!$ok($say('EHLO ' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost')), 250)) { $step = 'ehlo'; break; }
        if (!$ok($say('AUTH LOGIN'), 334))                                       { $step = 'auth'; break; }
        if (!$ok($say(base64_encode($user)), 334))                               { $step = 'user'; break; }
        if (!$ok($say(base64_encode($pass)), 235))                               { $step = 'pass'; break; }
    } while (false);

    if ($step !== '') {
        @fwrite($fp, "QUIT\r\n");
        @fclose($fp);
        error_log('mail: SMTP failed at step "' . $step . '" — no message was sent');
        return $step;
    }

    /* ---- then one envelope per message, over the same session ---- */
    $results = array();

    foreach ($messages as $m) {
        $to = trim((string) (isset($m['to']) ? $m['to'] : ''));
        if ($to === '') { $results[] = 'norcpt'; continue; }

        $fail = '';
        do {
            if (!$ok($say('MAIL FROM:<' . $user . '>'), 250)) { $fail = 'from'; break; }
            if (!$ok($say('RCPT TO:<' . $to . '>'), 250))     { $fail = 'rcpt'; break; }
            if (!$ok($say('DATA'), 354))                      { $fail = 'data'; break; }

            $body = sg_mime($cfg, $user, $to,
                isset($m['subject']) ? $m['subject'] : '',
                isset($m['html']) ? $m['html'] : '',
                isset($m['text']) ? $m['text'] : '',
                isset($m['inline']) ? $m['inline'] : array(),
                isset($m['replyTo']) ? $m['replyTo'] : '');

            /* a line that is a single dot ends DATA — double any leading dot */
            $body = preg_replace('/^\./m', '..', $body);

            fwrite($fp, $body . "\r\n.\r\n");
            if (!$ok($read(), 250)) { $fail = 'send'; break; }
        } while (false);

        if ($fail !== '') {
            error_log('mail: message to ' . $to . ' failed at step "' . $fail . '"');
            /* Put the session back in a known state so the NEXT message is not
               refused for being mid-transaction. A relay that will not reset
               is a relay that cannot carry the rest either. */
            if ($fail !== 'from' && !$ok($say('RSET'), 250)) {
                $results[] = $fail;
                for ($i = count($results); $i < count($messages); $i++) $results[] = 'aborted';
                break;
            }
        }

        $results[] = $fail === '' ? true : $fail;
    }

    @fwrite($fp, "QUIT\r\n");
    @fclose($fp);

    return $results;
}

/* --------------------------------------------------------------------------
   The envelope
   --------------------------------------------------------------------------
   Without inline images:  multipart/alternative  [ text, html ]
   With them:              multipart/related      [ multipart/alternative, png… ]

   The nesting is not decoration. A client that shows the plain part has to be
   able to find it, and a client that shows the HTML has to be able to resolve
   cid: against a sibling part. related-wrapping-alternative is the only order
   that gives both.
   -------------------------------------------------------------------------- */

function sg_mime($cfg, $user, $to, $subject, $html, $text, $inline, $replyTo) {
    $alt = '=_sga_' . bin2hex(random_bytes(8));
    $rel = '=_sgr_' . bin2hex(random_bytes(8));

    $fromName = preg_replace('/[^\x20-\x7E]/', '', (string)
        (isset($cfg['from_name']) ? $cfg['from_name'] : 'Website'));

    $headers = array(
        'From: "' . $fromName . '" <' . $user . '>',
        'To: <' . $to . '>',
        /* Non-ASCII in a subject has to be encoded or it arrives as mojibake;
           the em dashes in these subjects are exactly that case. */
        'Subject: ' . sg_mime_header($subject),
        'Date: ' . date('r'),
        'MIME-Version: 1.0',
    );

    /* Reply on the office copy should reach the person who wrote in, not the
       website's own sending account. */
    $replyTo = trim((string) $replyTo);
    if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: <' . $replyTo . '>';
    }

    /* An acknowledgement is a transactional reply, not a mailing. Saying so
       keeps it out of the recipient's "unsubscribe?" heuristics and stops a
       vacation responder answering the robot. */
    $headers[] = 'Auto-Submitted: auto-generated';
    $headers[] = 'X-Auto-Response-Suppress: OOF, AutoReply';

    $body  = "--$alt\r\nContent-Type: text/plain; charset=UTF-8\r\n"
           . "Content-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) . "\r\n"
           . "--$alt\r\nContent-Type: text/html; charset=UTF-8\r\n"
           . "Content-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "\r\n"
           . "--$alt--\r\n";

    if (!$inline) {
        $headers[] = 'Content-Type: multipart/alternative; boundary="' . $alt . '"';
        return implode("\r\n", $headers) . "\r\n\r\n" . $body;
    }

    $headers[] = 'Content-Type: multipart/related; boundary="' . $rel . '"';

    $out = implode("\r\n", $headers) . "\r\n\r\n"
         . "--$rel\r\nContent-Type: multipart/alternative; boundary=\"$alt\"\r\n\r\n"
         . $body;

    foreach ($inline as $img) {
        $data = @file_get_contents($img['file']);
        if ($data === false) continue;
        $name = basename($img['file']);

        $out .= "--$rel\r\n"
              . 'Content-Type: image/png; name="' . $name . "\"\r\n"
              . 'Content-ID: <' . $img['cid'] . ">\r\n"
              . "Content-Disposition: inline; filename=\"$name\"\r\n"
              . "Content-Transfer-Encoding: base64\r\n\r\n"
              . chunk_split(base64_encode($data)) . "\r\n";
    }

    return $out . "--$rel--\r\n";
}

/* RFC 2047 for anything that is not plain ASCII. Left alone when it is, so a
   normal subject stays readable in a raw message. */
function sg_mime_header($s) {
    $s = (string) $s;
    if (preg_match('/^[\x20-\x7E]*$/', $s)) return $s;
    return '=?UTF-8?B?' . base64_encode($s) . '?=';
}
