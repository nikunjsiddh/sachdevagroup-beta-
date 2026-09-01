<?php
/* ==========================================================================
   MAIL CONFIG — sample
   ==========================================================================
   Copy this file to  mail-config.php  and fill in the real values.

   mail-config.php is in .gitignore and MUST STAY THERE. It holds a live
   password: the moment it is committed it is public, and a Gmail app password
   grants full send rights on the account. This sample is the only version of
   the file that belongs in the repository.

   The password is a Google APP PASSWORD, not the account password. Generate
   one at https://myaccount.google.com/apppasswords (requires 2-Step
   Verification). Spaces in it are cosmetic — Google shows it as four groups
   of four; paste it either way, feedback-send.php strips them.
   ========================================================================== */

return array(

    /* the Gmail account that sends. */
    'user' => 'you@gmail.com',
    'pass' => 'xxxx xxxx xxxx xxxx',

    /* where feedback lands. Change this to info@sachdevagroup.in once the
       office mailbox should receive it instead. */
    'to'   => 'you@gmail.com',

    /* what the recipient sees in the From line. Gmail will not let this be an
       arbitrary address — it rewrites anything that is not the sending
       account or a verified alias — so keep the address equal to 'user' and
       change only the display name. */
    'from_name' => 'Sachdeva Group Website',

    /* smtp.gmail.com:465 is implicit TLS and needs no STARTTLS handshake.
       Leave these alone unless you move off Gmail. */
    'host' => 'smtp.gmail.com',
    'port' => 465,

    /* how many messages one IP address may send per hour. */
    'limit_per_hour' => 5
);
