<?php
/* ==========================================================================
   ADMIN — sign in, and the very first account
   ==========================================================================
   One page, two states.

   While sg_users is empty this shows a "create the first administrator" form
   instead of the sign-in. That is the whole installation: there is no default
   username and no default password anywhere in this codebase, because a
   shipped default is a published one — every copy of the site would have the
   same credentials until somebody remembered to change them.

   The window closes the moment the first account exists. From then on the
   setup form is unreachable and new administrators are made from users.php by
   somebody who is already signed in.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';

/* already signed in — nothing to do here */
if (sg_user()) sg_redirect('dashboard.php');

$setup  = sg_needs_setup();
$errors = array();

/* the page the visitor was trying to reach before being sent here */
$next = preg_replace('/[^a-z0-9_.\-]/i', '', sg_get('next'));
if ($next === '' || substr($next, -4) !== '.php' || $next === 'index.php') {
    $next = 'dashboard.php';
}

if (sg_is_post()) {
    sg_csrf_check();

    /* ---------- first run: create the owner ---------- */
    if ($setup) {
        /* Re-checked here rather than trusting $setup from the top of the
           request: two people opening the page at once would both see the
           setup form, and only the first should be able to use it. */
        if (!sg_needs_setup()) {
            sg_flash('warn', 'An administrator already exists. Please sign in.');
            sg_redirect('index.php');
        }

        $username = sg_post('username');
        $fullName = sg_post('full_name');
        $email    = sg_post('email');
        $pass     = isset($_POST['password']) ? (string) $_POST['password'] : '';
        $confirm  = isset($_POST['password2']) ? (string) $_POST['password2'] : '';

        if ($fullName === '') $errors[] = 'Please enter your name.';
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'That email address does not look right.';
        }

        $u = sg_username_problem($username);
        if ($u !== '') $errors[] = $u;

        $p = sg_password_problem($pass, $confirm);
        if ($p !== '') $errors[] = $p;

        if (!$errors) {
            sg_create_user($username, $pass, $fullName, $email, 'owner');
            sg_login($username, $pass);
            sg_flash('ok', 'Welcome. Your owner account is ready — this is the whole panel.');
            sg_redirect('dashboard.php');
        }

    /* ---------- normal sign-in ---------- */
    } else {
        $username = sg_post('username');
        $pass     = isset($_POST['password']) ? (string) $_POST['password'] : '';

        $result = sg_login($username, $pass);
        if ($result === true) {
            sg_redirect($next);
        }
        $errors[] = $result;
    }
}

$username = isset($username) ? $username : '';
$fullName = isset($fullName) ? $fullName : '';
$email    = isset($email) ? $email : '';
$flash    = sg_take_flash();
?><!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title><?php echo $setup ? 'Set up the admin panel' : 'Sign in'; ?> &middot; Sachdeva Group</title>
    <link rel="icon" href="../images/logo.png">
    <link rel="stylesheet" href="assets/admin.css">
</head>

<body class="gate">

    <main class="gate__card">

        <div class="gate__brand">
            <img src="../images/logo.png" alt="Sachdeva Group of Industries" width="52" height="47">
            <span>Sachdeva Group of Industries</span>
        </div>

        <?php if ($setup): ?>
            <h1>Set up the admin panel</h1>
            <p class="gate__lead">
                No administrator exists yet. The account you create here is the owner:
                it can publish content and create the other administrators.
            </p>
        <?php else: ?>
            <h1>Sign in</h1>
            <p class="gate__lead">Website content for news, the gallery and visitor feedback.</p>
        <?php endif; ?>

        <?php foreach ($flash as $f): ?>
            <div class="note note--<?php echo e($f['kind']); ?>"><?php echo e($f['msg']); ?></div>
        <?php endforeach; ?>

        <?php if ($errors): ?>
            <div class="note note--error" role="alert">
                <?php foreach ($errors as $i => $err): ?>
                    <?php echo $i ? '<br>' : ''; ?><?php echo e($err); ?>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <form method="post" action="index.php<?php echo $setup ? '' : '?next=' . e(rawurlencode($next)); ?>" autocomplete="on">
            <?php echo sg_csrf_field(); ?>

            <?php if ($setup): ?>
                <label class="field">
                    <span>Your name</span>
                    <input type="text" name="full_name" value="<?php echo e($fullName); ?>"
                           maxlength="80" required autofocus autocomplete="name">
                </label>

                <label class="field">
                    <span>Email <em>optional</em></span>
                    <input type="email" name="email" value="<?php echo e($email); ?>"
                           maxlength="120" autocomplete="email">
                </label>
            <?php endif; ?>

            <label class="field">
                <span>Username</span>
                <input type="text" name="username" value="<?php echo e($username); ?>"
                       maxlength="40" required <?php echo $setup ? '' : 'autofocus'; ?>
                       autocomplete="username" spellcheck="false">
            </label>

            <label class="field">
                <span>Password</span>
                <input type="password" name="password" required
                       autocomplete="<?php echo $setup ? 'new-password' : 'current-password'; ?>">
            </label>

            <?php if ($setup): ?>
                <label class="field">
                    <span>Repeat password</span>
                    <input type="password" name="password2" required autocomplete="new-password">
                </label>
                <p class="gate__hint">At least 8 characters. It cannot be recovered, only reset.</p>
            <?php endif; ?>

            <button type="submit" class="btn btn--primary btn--block">
                <?php echo $setup ? 'Create owner account' : 'Sign in'; ?>
            </button>
        </form>

        <p class="gate__foot"><a href="../index.html">&larr; Back to the website</a></p>

    </main>

</body>

</html>
