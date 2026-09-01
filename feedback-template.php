<?php
/* ==========================================================================
   FEEDBACK — the email itself
   ==========================================================================
   Two builders, one for each half of the multipart message. Kept apart from
   feedback-send.php so the markup can be edited without going near the SMTP
   or the validation.

   WHY IT LOOKS LIKE 2005 HTML
   Mail clients are not browsers. Outlook renders through Word, Gmail strips
   <style> blocks and anything in <head>, and neither honours flexbox, grid or
   external CSS. Tables with inline styles are not a stylistic choice here —
   they are the only layout that arrives intact. The palette is the site's:
   ink #071a2e, cyan #22b3e6, gold #ffad18.

   Every value is passed through h() on the way in. A note is free text typed
   by a stranger; unescaped, "<b>" would be markup and an <img> tag would be a
   tracking pixel pointed at whoever opens the mail.
   ========================================================================== */

function h($s) {
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function sgfb_email_html($type, $name, $role, $tel, $note, $sentAt) {

    /* one row of the detail table */
    $row = function ($label, $value, $last = false) {
        $border = $last ? '' : 'border-bottom:1px solid #edf2f7;';
        return '<tr>'
            . '<td style="' . $border . 'padding:14px 0 13px;font:600 11px/1.4 Arial,Helvetica,sans-serif;'
            . 'letter-spacing:2px;text-transform:uppercase;color:#6b8298;width:150px;vertical-align:top;">'
            . h($label) . '</td>'
            . '<td style="' . $border . 'padding:14px 0 13px;font:400 16px/1.55 Arial,Helvetica,sans-serif;'
            . 'color:#0d2135;">' . h($value) . '</td>'
            . '</tr>';
    };

    $noteHtml = nl2br(h($note));

    return '<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Website feedback</title></head>
<body style="margin:0;padding:0;background:#eef3f8;">

<!-- the line the inbox shows beside the subject, before anything is opened -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">'
    . h($name) . ' &middot; ' . h($type) . ' &middot; ' . h($tel) . '</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#eef3f8;padding:28px 12px;">
<tr><td align="center">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
         style="width:600px;max-width:100%;background:#ffffff;border:1px solid #dde6f0;">

    <!-- header -->
    <tr><td style="background:#071a2e;padding:30px 34px 26px;">
      <div style="font:600 11px/1 Arial,Helvetica,sans-serif;letter-spacing:2.6px;
                  text-transform:uppercase;color:#35c6f4;">Sachdeva Group of Industries</div>
      <div style="font:400 27px/1.25 Arial,Helvetica,sans-serif;color:#ffffff;padding-top:10px;">
        New Website Feedback</div>
      <div style="width:52px;height:3px;background:#ffad18;margin-top:16px;font-size:0;line-height:0;">&nbsp;</div>
    </td></tr>

    <!-- who it is from -->
    <tr><td style="padding:26px 34px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:#eaf7fe;border:1px solid #b9e6f8;padding:9px 16px;
                   font:600 11px/1 Arial,Helvetica,sans-serif;letter-spacing:2.2px;
                   text-transform:uppercase;color:#0d6a94;">Feedback from &middot; '
                   . h($type) . '</td>
      </tr></table>
    </td></tr>

    <!-- the details -->
    <tr><td style="padding:6px 34px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        . $row('Name', $name)
        . $row('Designation', $role)
        . $row('Mobile No.', $tel, true)
      . '</table>
    </td></tr>

    <!-- the note -->
    <tr><td style="padding:22px 34px 0;">
      <div style="font:600 11px/1 Arial,Helvetica,sans-serif;letter-spacing:2px;
                  text-transform:uppercase;color:#6b8298;padding-bottom:10px;">Note</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:#f6fafd;border-left:3px solid #22b3e6;padding:16px 18px;
                       font:400 15px/1.75 Arial,Helvetica,sans-serif;color:#22384c;">'
          . $noteHtml . '</td></tr>
      </table>
    </td></tr>

    <!-- call back -->
    <tr><td style="padding:24px 34px 30px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:#ffad18;">
          <a href="tel:' . h(preg_replace('/[^0-9+]/', '', $tel)) . '"
             style="display:inline-block;padding:13px 26px;font:600 12px/1 Arial,Helvetica,sans-serif;
                    letter-spacing:2.2px;text-transform:uppercase;color:#071a2e;text-decoration:none;">
            Call ' . h($name) . '</a>
        </td>
      </tr></table>
    </td></tr>

    <!-- footer -->
    <tr><td style="background:#f4f8fb;border-top:1px solid #e4ecf4;padding:16px 34px;
                   font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#6b8298;">
      Received ' . h($sentAt) . ' &middot; sent by the feedback form on sachdevagroup.in
    </td></tr>

  </table>

  <div style="font:400 11px/1.6 Arial,Helvetica,sans-serif;color:#8ba0b5;padding-top:14px;">
    This message was generated by the website. Reply to the sender at the number above.
  </div>

</td></tr>
</table>
</body></html>';
}

function sgfb_email_text($type, $name, $role, $tel, $note, $sentAt) {
    return "NEW WEBSITE FEEDBACK\r\n"
         . "Sachdeva Group of Industries\r\n"
         . str_repeat('-', 46) . "\r\n\r\n"
         . "Feedback from : $type\r\n"
         . "Name          : $name\r\n"
         . "Designation   : $role\r\n"
         . "Mobile No.    : $tel\r\n\r\n"
         . "Note:\r\n$note\r\n\r\n"
         . str_repeat('-', 46) . "\r\n"
         . "Received $sentAt via the feedback form on sachdevagroup.in\r\n";
}
