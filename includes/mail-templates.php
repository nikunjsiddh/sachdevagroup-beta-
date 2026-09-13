<?php
/* ==========================================================================
   MAIL TEMPLATES
   ==========================================================================
   Three messages, one shell:

     sgm_office_enquiry()   the contact form, to the office
     sgm_office_feedback()  the feedback form, to the office
     sgm_ack()              the acknowledgement, back to whoever wrote in

   WHY IT LOOKS LIKE 2005 HTML
   Mail clients are not browsers. Outlook renders through Word, Gmail strips
   <style> blocks and everything in <head>, and neither honours flexbox, grid,
   external CSS or a web font. Nested tables with inline styles are not a
   stylistic choice — they are the only layout that arrives intact.

   The palette is the site's: ink #071a2e, cyan #22b3e6, gold #ffad18. The
   display face is not: Oswald cannot be loaded in mail, so the headings lean
   on uppercase and wide letter-spacing to read the way the site's do, in a
   font that is actually installed everywhere.

   IMAGES ARE AN ENHANCEMENT, NEVER THE MESSAGE
   Every client can block images and most block them until asked. The logo and
   the icons ride along as cid: parts (see includes/mailer.php) so they need no
   server, but each one sits on a coloured cell and carries real alt text — with
   images off the layout still reads as a laid-out message rather than as a row
   of broken boxes.

   Every value is escaped on the way in. A note is free text typed by a
   stranger; unescaped, "<b>" would be markup and an <img> would be a tracking
   pixel pointed at whoever opens the mail.
   ========================================================================== */

if (!function_exists('sgm_h')) {
    function sgm_h($s) {
        return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

/* --------------------------------------------------------------------------
   Tokens and standing details
   -------------------------------------------------------------------------- */

function sgm() {
    return array(
        'ink'    => '#071a2e', 'ink2' => '#0d2135', 'ink3' => '#22384c',
        'grey'   => '#6b8298', 'line' => '#dde6f0', 'line2' => '#edf2f7',
        'bg'     => '#eef3f8', 'cyan' => '#22b3e6', 'cyanB' => '#35c6f4',
        'cyanD'  => '#0d6a94', 'cyanL' => '#eaf7fe', 'gold'  => '#ffad18',
        'font'   => 'Arial,Helvetica,sans-serif',
    );
}

function sgm_office() {
    return array(
        'name'  => 'Sachdeva Group of Industries',
        'addr'  => '“Sachdeva House”, Opp. Swaminarayan Mandir, Lokhand Bazar, Bhavnagar, Gujarat, India',
        'yard'  => 'Plot No. 65, Alang Ship Recycling Yard, Alang, Bhavnagar, Gujarat, India',
        'tel'   => '+91 278 2429573',
        'email' => 'info@sachdevagroup.in',
        'site'  => 'https://sachdevagroup.in',
    );
}

/* Which cid: parts a message needs, so the sender attaches those and no more. */
function sgm_cids($which) {
    $sets = array(
        'office' => array('logo', 'user', 'phone', 'mail', 'chat', 'clock', 'pin'),
        'ack'    => array('logo', 'check', 'phone', 'mail', 'pin'),
    );
    return isset($sets[$which]) ? $sets[$which] : array('logo');
}

/* --------------------------------------------------------------------------
   Pieces
   -------------------------------------------------------------------------- */

/* A 34px chip carrying a white line icon. The background is what shows when
   the image is blocked, so the row still has a marker in the right place. */
function sgm_icon($cid, $bg = null) {
    $c = sgm();
    $bg = $bg ? $bg : $c['cyanD'];
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
         . '<td width="34" height="34" align="center" valign="middle"'
         . ' style="width:34px;height:34px;background:' . $bg . ';border-radius:8px;">'
         . '<img src="cid:sg-' . sgm_h($cid) . '" width="18" height="18" alt=""'
         . ' style="display:block;border:0;width:18px;height:18px;"></td>'
         . '</tr></table>';
}

/* One label/value line of the detail table. */
function sgm_row($icon, $label, $value, $last = false) {
    $c = sgm();
    if (trim((string) $value) === '') return '';
    $b = $last ? '' : 'border-bottom:1px solid ' . $c['line2'] . ';';

    return '<tr>'
        . '<td width="34" style="' . $b . 'padding:15px 14px 14px 0;vertical-align:top;">'
        . sgm_icon($icon) . '</td>'
        . '<td style="' . $b . 'padding:15px 0 14px;vertical-align:top;">'
        . '<div style="font:700 10px/1.4 ' . $c['font'] . ';letter-spacing:2.2px;'
        . 'text-transform:uppercase;color:' . $c['grey'] . ';padding-bottom:5px;">'
        . sgm_h($label) . '</div>'
        . '<div style="font:400 16px/1.5 ' . $c['font'] . ';color:' . $c['ink2'] . ';">'
        . sgm_h($value) . '</div>'
        . '</td></tr>';
}

/* The masthead: logo, company, and the gold datum the site uses under its
   section headings. */
function sgm_head($eyebrow, $title) {
    $c = sgm(); $o = sgm_office();

    return '<tr><td style="background:' . $c['ink'] . ';padding:26px 34px 26px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="66" style="width:66px;vertical-align:middle;padding-right:15px;">
          <!-- The logo is navy lettering and a navy anchor beside an orange
               wheel, so on the ink masthead behind it only the wheel survived
               and the wordmark disappeared. It sits on the same near-white
               plate the site header uses instead — background-color first for
               Outlook, which renders through Word and ignores the gradient,
               and a solid hex border because rgba() is no better supported. -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="66" height="58" align="center" valign="middle"
                style="width:66px;height:58px;background-color:#f4f8fc;
                       background-image:linear-gradient(150deg,#ffffff 0%,#e9f1f8 100%);
                       border:1px solid #d8e3ee;border-radius:10px;">
              <img src="cid:sg-logo" width="46" height="41" alt="' . sgm_h($o['name']) . '"
                   style="display:block;border:0;width:46px;height:41px;">
            </td>
          </tr></table>
        </td>
        <td style="vertical-align:middle;">
          <div style="font:700 11px/1.3 ' . $c['font'] . ';letter-spacing:2.6px;
                      text-transform:uppercase;color:' . $c['cyanB'] . ';">'
            . sgm_h($eyebrow) . '</div>
          <div style="font:700 12px/1.4 ' . $c['font'] . ';letter-spacing:1.4px;
                      text-transform:uppercase;color:#96b3cb;padding-top:4px;">'
            . sgm_h($o['name']) . '</div>
        </td>
      </tr></table>

      <div style="font:400 27px/1.3 ' . $c['font'] . ';color:#ffffff;padding-top:20px;">'
        . sgm_h($title) . '</div>
      <div style="width:54px;height:3px;background:' . $c['gold'] . ';margin-top:15px;
                  font-size:0;line-height:0;">&nbsp;</div>
    </td></tr>';
}

/* The standing footer: how to reach the office, on every message. */
function sgm_foot($closing) {
    $c = sgm(); $o = sgm_office();

    $line = function ($icon, $text, $href = '') use ($c) {
        $val = $href !== ''
            ? '<a href="' . sgm_h($href) . '" style="color:' . $c['ink2'] . ';text-decoration:none;">'
              . sgm_h($text) . '</a>'
            : sgm_h($text);

        return '<tr>'
             . '<td width="34" style="padding:0 12px 12px 0;vertical-align:top;">' . sgm_icon($icon, $c['cyanD']) . '</td>'
             . '<td style="padding:0 0 12px;vertical-align:middle;font:400 14px/1.6 ' . $c['font'] . ';'
             . 'color:' . $c['ink2'] . ';">' . $val . '</td></tr>';
    };

    return '<tr><td style="background:#f4f8fb;border-top:1px solid #e4ecf4;padding:26px 34px 22px;">
      <div style="font:700 10px/1 ' . $c['font'] . ';letter-spacing:2.2px;text-transform:uppercase;
                  color:' . $c['grey'] . ';padding-bottom:16px;">Reach the office</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        . $line('phone', $o['tel'], 'tel:' . preg_replace('/[^0-9+]/', '', $o['tel']))
        . $line('mail', $o['email'], 'mailto:' . $o['email'])
        . $line('pin', $o['yard'])
      . '</table>
      <div style="border-top:1px solid #e4ecf4;margin-top:6px;padding-top:16px;
                  font:400 12px/1.7 ' . $c['font'] . ';color:' . $c['grey'] . ';">'
        . sgm_h($closing) . '</div>
    </td></tr>';
}

/* --------------------------------------------------------------------------
   The shell
   -------------------------------------------------------------------------- */

function sgm_shell($preheader, $eyebrow, $title, $inner, $closing) {
    $c = sgm();

    return '<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>' . sgm_h($title) . '</title></head>
<body style="margin:0;padding:0;background:' . $c['bg'] . ';">

<!-- the line the inbox lists beside the subject, before anything is opened -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">'
  . sgm_h($preheader) . '</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:' . $c['bg'] . ';padding:30px 12px;">
<tr><td align="center">

  <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0"
         style="width:620px;max-width:100%;background:#ffffff;border:1px solid ' . $c['line'] . ';">'
    . sgm_head($eyebrow, $title)
    . $inner
    . sgm_foot($closing)
  . '</table>

  <div style="font:400 11px/1.6 ' . $c['font'] . ';color:#8ba0b5;padding-top:14px;max-width:620px;">
    Sent by the website at sachdevagroup.in
  </div>

</td></tr>
</table>
</body></html>';
}

/* --------------------------------------------------------------------------
   1. Contact enquiry, to the office
   -------------------------------------------------------------------------- */

function sgm_office_enquiry($d) {
    $c = sgm();

    $inner = '<tr><td style="padding:24px 34px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:' . $c['cyanL'] . ';border:1px solid #b9e6f8;padding:9px 16px;
                   font:700 10px/1 ' . $c['font'] . ';letter-spacing:2.2px;text-transform:uppercase;
                   color:' . $c['cyanD'] . ';">New enquiry &middot; contact form</td>
      </tr></table></td></tr>

    <tr><td style="padding:4px 34px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        . sgm_row('user', 'Name', $d['name'])
        . sgm_row('mail', 'Email', $d['email'])
        . sgm_row('phone', 'Phone', $d['phone'])
        . sgm_row('clock', 'Received', $d['sentAt'], true)
      . '</table></td></tr>'

    . sgm_note('Message', $d['message'])
    . sgm_actions(array(
        array('Reply to ' . $d['name'], 'mailto:' . $d['email'], true),
        array('Call', 'tel:' . preg_replace('/[^0-9+]/', '', $d['phone']), false),
      ));

    return sgm_shell(
        $d['name'] . ' · ' . $d['email'] . ' · ' . sgm_excerpt($d['message'], 90),
        'Website enquiry', 'New Enquiry', $inner,
        'This message was generated by the enquiry form. Reply goes straight to the sender.');
}

/* --------------------------------------------------------------------------
   2. Feedback, to the office
   -------------------------------------------------------------------------- */

function sgm_office_feedback($d) {
    $c = sgm();

    $inner = '<tr><td style="padding:24px 34px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:' . $c['cyanL'] . ';border:1px solid #b9e6f8;padding:9px 16px;
                   font:700 10px/1 ' . $c['font'] . ';letter-spacing:2.2px;text-transform:uppercase;
                   color:' . $c['cyanD'] . ';">Feedback from &middot; ' . sgm_h($d['type']) . '</td>
      </tr></table></td></tr>

    <tr><td style="padding:4px 34px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        . sgm_row('user', 'Name', $d['name'])
        . sgm_row('chat', 'Designation', $d['role'])
        . sgm_row('phone', 'Mobile', $d['tel'])
        . sgm_row('mail', 'Email', $d['email'])
        . sgm_row('clock', 'Received', $d['sentAt'], true)
      . '</table></td></tr>'

    . sgm_note('What they said', $d['note'])
    . sgm_actions(array(
        array('Call ' . $d['name'], 'tel:' . preg_replace('/[^0-9+]/', '', $d['tel']), true),
      ));

    return sgm_shell(
        $d['name'] . ' · ' . $d['type'] . ' · ' . sgm_excerpt($d['note'], 90),
        'Website feedback', 'New Feedback', $inner,
        'Recorded in the admin panel under Complaints, whether or not this email arrived.');
}

/* --------------------------------------------------------------------------
   3. The acknowledgement, back to the sender
   --------------------------------------------------------------------------
   Deliberately short. It confirms one thing — that a real person has it — and
   repeats what was sent so the sender has their own copy. It asks for nothing.
   -------------------------------------------------------------------------- */

function sgm_ack($d) {
    $c = sgm(); $o = sgm_office();

    $inner = '<tr><td style="padding:30px 34px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="46" style="width:46px;padding-right:16px;vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="46" height="46" align="center" valign="middle"
                style="width:46px;height:46px;background:' . $c['cyan'] . ';border-radius:50%;">
              <img src="cid:sg-check" width="22" height="22" alt="Received"
                   style="display:block;border:0;width:22px;height:22px;"></td>
          </tr></table>
        </td>
        <td style="vertical-align:middle;">
          <div style="font:400 20px/1.4 ' . $c['font'] . ';color:' . $c['ink'] . ';">
            Thank you, ' . sgm_h($d['first']) . '.</div>
          <div style="font:400 15px/1.6 ' . $c['font'] . ';color:' . $c['grey'] . ';padding-top:5px;">
            We have your ' . sgm_h($d['kind']) . ' and it is with the office.</div>
        </td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:22px 34px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:#f6fafd;border-left:3px solid ' . $c['cyan'] . ';padding:18px 20px;
                       font:400 15px/1.7 ' . $c['font'] . ';color:' . $c['ink3'] . ';">
          Somebody from Sachdeva Group will read this and come back to you if a reply
          is needed. Our office hours are Monday to Saturday, 9:30 am to 6:30 pm IST.
        </td></tr>
      </table>
    </td></tr>'

    . sgm_note('Your ' . $d['kind'] . ', as we received it', $d['message'])

    . '<tr><td style="padding:22px 34px 0;">
      <div style="font:700 10px/1 ' . $c['font'] . ';letter-spacing:2.2px;text-transform:uppercase;
                  color:' . $c['grey'] . ';padding-bottom:12px;">Sent ' . sgm_h($d['sentAt']) . '</div>
    </td></tr>'

    . sgm_actions(array(
        array('Visit the website', $o['site'], true),
      ));

    return sgm_shell(
        'We have your ' . $d['kind'] . ' — someone from the office will be in touch.',
        'Sachdeva Group', 'We have your ' . ucfirst($d['kind']), $inner,
        'This is an automatic confirmation. You do not need to reply to it — but if you '
        . 'do, it reaches the office.');
}

/* --------------------------------------------------------------------------
   Shared blocks
   -------------------------------------------------------------------------- */

/* The quoted block. nl2br AFTER escaping, so a newline is a line break and a
   "<br>" somebody typed is four visible characters. */
function sgm_note($label, $text) {
    $c = sgm();
    if (trim((string) $text) === '') return '';

    return '<tr><td style="padding:24px 34px 0;">
      <div style="font:700 10px/1 ' . $c['font'] . ';letter-spacing:2.2px;text-transform:uppercase;
                  color:' . $c['grey'] . ';padding-bottom:11px;">' . sgm_h($label) . '</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:#f6fafd;border:1px solid ' . $c['line2'] . ';
                       border-left:3px solid ' . $c['cyan'] . ';padding:18px 20px;
                       font:400 15px/1.75 ' . $c['font'] . ';color:' . $c['ink3'] . ';">'
          . nl2br(sgm_h(trim((string) $text))) . '</td></tr>
      </table>
    </td></tr>';
}

/* Buttons. Bulletproof-ish: the colour is on the cell, not the anchor, so a
   client that drops the anchor's background still shows a filled button. */
function sgm_actions($buttons) {
    $c = sgm();
    $cells = '';

    foreach ($buttons as $b) {
        list($label, $href, $primary) = $b;
        if (trim((string) $href) === '' || substr($href, -1) === ':') continue;

        $bg   = $primary ? $c['gold'] : '#ffffff';
        $fg   = $primary ? $c['ink'] : $c['ink2'];
        $bord = $primary ? $c['gold'] : $c['line'];

        $cells .= '<td style="padding:0 10px 10px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:' . $bg . ';border:1px solid ' . $bord . ';">
              <a href="' . sgm_h($href) . '" style="display:inline-block;padding:13px 26px;
                 font:700 11px/1 ' . $c['font'] . ';letter-spacing:2.2px;text-transform:uppercase;
                 color:' . $fg . ';text-decoration:none;">' . sgm_h($label) . '</a>
            </td>
          </tr></table></td>';
    }

    if ($cells === '') return '';

    return '<tr><td style="padding:26px 34px 30px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
      . $cells . '</tr></table></td></tr>';
}

function sgm_excerpt($text, $len) {
    $text = trim(preg_replace('/\s+/u', ' ', (string) $text));
    return mb_strlen($text, 'UTF-8') <= $len ? $text : mb_substr($text, 0, $len, 'UTF-8') . '…';
}

/* --------------------------------------------------------------------------
   Plain text
   --------------------------------------------------------------------------
   Not a fallback nobody reads: it is what a screen reader in text mode gets,
   what a watch shows, and what lands when the HTML part is stripped.
   -------------------------------------------------------------------------- */

function sgm_text_office($title, $pairs, $noteLabel, $note) {
    $o = sgm_office();
    $out = strtoupper($title) . "\r\n" . $o['name'] . "\r\n" . str_repeat('-', 52) . "\r\n\r\n";

    foreach ($pairs as $label => $value) {
        if (trim((string) $value) === '') continue;
        $out .= str_pad($label, 14) . ': ' . $value . "\r\n";
    }

    $out .= "\r\n" . strtoupper($noteLabel) . ":\r\n" . trim((string) $note) . "\r\n\r\n"
          . str_repeat('-', 52) . "\r\n"
          . $o['tel'] . ' | ' . $o['email'] . "\r\n" . $o['yard'] . "\r\n";
    return $out;
}

function sgm_text_ack($first, $kind, $message, $sentAt) {
    $o = sgm_office();
    return "Thank you, $first.\r\n\r\n"
         . "We have your $kind and it is with the office. Somebody from Sachdeva Group\r\n"
         . "will read it and come back to you if a reply is needed. Our office hours are\r\n"
         . "Monday to Saturday, 9:30 am to 6:30 pm IST.\r\n\r\n"
         . str_repeat('-', 52) . "\r\n"
         . "YOUR " . strtoupper($kind) . ", AS WE RECEIVED IT (" . $sentAt . ")\r\n\r\n"
         . trim((string) $message) . "\r\n\r\n"
         . str_repeat('-', 52) . "\r\n"
         . $o['name'] . "\r\n" . $o['tel'] . ' | ' . $o['email'] . "\r\n"
         . $o['yard'] . "\r\n" . $o['site'] . "\r\n\r\n"
         . "This is an automatic confirmation.\r\n";
}
