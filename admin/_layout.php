<?php
/* ==========================================================================
   ADMIN — page chrome
   ==========================================================================
   The shell every signed-in page prints: <head>, the sidebar, the flash
   messages, and the closing markup. Kept out of the pages themselves so the
   navigation is defined once.
   ========================================================================== */

/* The badge beside "Complaints" in the sidebar — how many notes from the
   website form have not been dealt with. It is the one number in the panel
   that means "somebody has to do something", so it is on every page rather
   than only the dashboard.

   It counts complaints and not testimonials on purpose: an unpublished
   testimonial is a draft somebody is choosing not to print, which nobody
   needs chasing about. An unanswered message from a visitor is. */
function sg_open_complaint_count() {
    static $n = null;
    if ($n === null) {
        $n = (int) sg_val("SELECT COUNT(*) FROM sg_complaints WHERE status = 'new'", array(), 0);
    }
    return $n;
}

function sg_nav_items() {
    return array(
        array('dashboard.php', 'Dashboard', 'M3 12l9-8 9 8M5 10v10h14V10'),
        array('news.php',      'News',      'M4 5h16v14H4zM8 9h8M8 13h8M8 17h5'),
        array('gallery.php',   'Gallery',   'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6'),
        array('certificates.php', 'Certificates', 'M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6zM9 12l2 2 4-4'),
        array('testimonials.php', 'Testimonials', 'M7.5 6h9M7.5 10h9M7.5 14h5M4 4h16v13H8l-4 4z'),
        array('complaints.php',   'Complaints',   'M12 4.2 21 19.8H3zM12 10v4M12 16.6v.2'),
        array('users.php',     'Users',     'M4 20c0-3.3 3.6-5 8-5s8 1.7 8 5M12 4a4 4 0 110 8 4 4 0 010-8'),
    );
}

function sg_admin_head($title, $active = '') {
    $u = sg_user();
    $pending = sg_open_complaint_count();
    ?><!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- an admin panel has no business in a search index -->
    <meta name="robots" content="noindex, nofollow">
    <title><?php echo e($title); ?> &middot; Sachdeva Group Admin</title>
    <link rel="icon" href="../images/logo.png">
    <link rel="stylesheet" href="assets/admin.css">
</head>

<body>
    <a class="skip" href="#main">Skip to content</a>

    <div class="shell">

        <aside class="side" id="side">
            <div class="side__brand">
                <img src="../images/logo.png" alt="" width="34" height="31">
                <span>
                    <strong>Sachdeva Group</strong>
                    <em>Website admin</em>
                </span>
            </div>

            <nav class="side__nav" aria-label="Sections">
                <?php foreach (sg_nav_items() as $item):
                    list($href, $label, $path) = $item;
                    if ($href === 'users.php' && !sg_is_owner()) continue;
                    $on = ($active === $href); ?>
                    <a href="<?php echo e($href); ?>"<?php echo $on ? ' class="is-on" aria-current="page"' : ''; ?>>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="<?php echo e($path); ?>"/></svg>
                        <span><?php echo e($label); ?></span>
                        <?php if ($href === 'complaints.php' && $pending): ?>
                            <b class="pip" title="<?php echo (int) $pending; ?> still open"><?php echo (int) $pending; ?></b>
                        <?php endif; ?>
                    </a>
                <?php endforeach; ?>
            </nav>

            <div class="side__foot">
                <a class="side__site" href="../index.html" target="_blank" rel="noopener">
                    View website
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>
                    </svg>
                </a>
                <?php if ($u): ?>
                    <div class="side__me">
                        <span class="side__av"><?php echo e(sg_initials($u['full_name'] !== '' ? $u['full_name'] : $u['username'], 2)); ?></span>
                        <span class="side__who">
                            <strong><?php echo e($u['full_name'] !== '' ? $u['full_name'] : $u['username']); ?></strong>
                            <em><?php echo e($u['role'] === 'owner' ? 'Owner' : 'Editor'); ?></em>
                        </span>
                    </div>
                    <form method="post" action="logout.php" class="side__out">
                        <?php echo sg_csrf_field(); ?>
                        <button type="submit">Sign out</button>
                    </form>
                <?php endif; ?>
            </div>
        </aside>

        <main class="main" id="main">
            <header class="bar">
                <button type="button" class="bar__burger" id="burger" aria-label="Menu" aria-expanded="false">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
                         stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
                </button>
                <h1><?php echo e($title); ?></h1>
                <form method="post" action="publish.php" class="bar__pub">
                    <?php echo sg_csrf_field(); ?>
                    <button type="submit" class="btn btn--ghost" title="Rewrite every managed section of the website from what is stored here">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6"/>
                        </svg>
                        Republish site
                    </button>
                </form>
            </header>

            <div class="wrap">
                <?php foreach (sg_take_flash() as $f): ?>
                    <div class="note note--<?php echo e($f['kind']); ?>" role="status">
                        <?php echo e($f['msg']); ?>
                    </div>
                <?php endforeach; ?>
<?php
}

function sg_admin_foot() {
    ?>
            </div>
        </main>
    </div>

    <div class="scrim" id="scrim" hidden></div>
    <script src="assets/admin.js"></script>
</body>

</html>
<?php
}
