<?php
/* ==========================================================================
   ADMIN — dashboard
   ==========================================================================
   Counts, whatever is waiting for a decision, and the health of the four
   pages this panel writes into. The health panel exists because every way
   publishing can fail is silent from the website's side: a page whose markers
   were deleted, or that the web server cannot write, looks exactly like a
   page nobody has published to yet.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';
sg_require_login();
require __DIR__ . '/_layout.php';

$stats = array(
    'news_total'     => (int) sg_val('SELECT COUNT(*) FROM sg_news', array(), 0),
    'news_live'      => (int) sg_val('SELECT COUNT(*) FROM sg_news WHERE is_published = 1', array(), 0),
    'gallery_total'  => (int) sg_val('SELECT COUNT(*) FROM sg_gallery', array(), 0),
    'gallery_live'   => (int) sg_val('SELECT COUNT(*) FROM sg_gallery WHERE is_published = 1', array(), 0),
    'cert_total'     => (int) sg_val('SELECT COUNT(*) FROM sg_certificates', array(), 0),
    'cert_live'      => (int) sg_val('SELECT COUNT(*) FROM sg_certificates WHERE is_published = 1', array(), 0),
    'fb_pending'     => (int) sg_val("SELECT COUNT(*) FROM sg_feedback WHERE status = 'pending'", array(), 0),
    'fb_approved'    => (int) sg_val("SELECT COUNT(*) FROM sg_feedback WHERE status = 'approved'", array(), 0),
    'users'          => sg_user_count(),
);

$waiting = sg_all("SELECT * FROM sg_feedback WHERE status = 'pending'
                   ORDER BY id DESC LIMIT 5");

$recentNews = sg_all('SELECT id, title, published_on, is_published FROM sg_news
                      ORDER BY id DESC LIMIT 5');

$health = array(
    'news'         => sg_target_status('news'),
    'gallery'      => sg_target_status('gallery'),
    'certificates' => sg_target_status('certificates'),
    'testimonials' => sg_target_status('testimonials'),
);

$healthLabels = array(
    'news'         => 'News page',
    'gallery'      => 'Gallery page',
    'certificates' => 'Certificates on the credentials page',
    'testimonials' => 'Feedback on the About page',
);

sg_admin_head('Dashboard', 'dashboard.php');
?>

<div class="tiles">
    <a class="tile" href="news.php">
        <span class="tile__n"><?php echo $stats['news_live']; ?></span>
        <span class="tile__k">News articles live</span>
        <span class="tile__s"><?php echo $stats['news_total']; ?> in total</span>
    </a>

    <a class="tile" href="gallery.php">
        <span class="tile__n"><?php echo $stats['gallery_live']; ?></span>
        <span class="tile__k">Gallery photographs live</span>
        <span class="tile__s"><?php echo $stats['gallery_total']; ?> in total</span>
    </a>

    <a class="tile" href="certificates.php">
        <span class="tile__n"><?php echo $stats['cert_live']; ?></span>
        <span class="tile__k">Certificates live</span>
        <span class="tile__s"><?php echo $stats['cert_total']; ?> in total</span>
    </a>

    <a class="tile<?php echo $stats['fb_pending'] ? ' tile--alert' : ''; ?>" href="feedback.php?status=pending">
        <span class="tile__n"><?php echo $stats['fb_pending']; ?></span>
        <span class="tile__k">Feedback awaiting review</span>
        <span class="tile__s"><?php echo $stats['fb_approved']; ?> published on the About page</span>
    </a>

    <?php if (sg_is_owner()): ?>
        <a class="tile" href="users.php">
            <span class="tile__n"><?php echo $stats['users']; ?></span>
            <span class="tile__k">Administrator<?php echo $stats['users'] === 1 ? '' : 's'; ?></span>
            <span class="tile__s">Who can sign in here</span>
        </a>
    <?php endif; ?>
</div>

<div class="cols">

    <section class="card">
        <div class="card__head">
            <h2>Feedback waiting for you</h2>
            <a class="lnk" href="feedback.php?status=pending">Review all</a>
        </div>

        <?php if (!$waiting): ?>
            <p class="empty">Nothing is waiting. Notes sent through the website form
                appear here before anything of theirs reaches the About page.</p>
        <?php else: ?>
            <ul class="feed">
                <?php foreach ($waiting as $f): ?>
                    <li>
                        <span class="feed__av"><?php echo e(sg_initials($f['name'], 2)); ?></span>
                        <span class="feed__body">
                            <strong><?php echo e($f['name']); ?></strong>
                            <em><?php echo e($f['feedback_type']); ?><?php
                                echo $f['designation'] !== '' ? ' · ' . e($f['designation']) : ''; ?></em>
                            <span><?php echo e(sg_excerpt($f['note'], 120)); ?></span>
                        </span>
                        <a class="lnk" href="feedback.php?status=pending#f<?php echo (int) $f['id']; ?>">Open</a>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </section>

    <section class="card">
        <div class="card__head">
            <h2>Latest news entries</h2>
            <a class="lnk" href="news.php?action=new">Add article</a>
        </div>

        <?php if (!$recentNews): ?>
            <p class="empty">No articles yet. Until one is published the news page keeps
                its &ldquo;nothing published yet&rdquo; note.</p>
        <?php else: ?>
            <ul class="feed feed--plain">
                <?php foreach ($recentNews as $n): ?>
                    <li>
                        <span class="feed__body">
                            <strong><?php echo e($n['title']); ?></strong>
                            <em><?php echo e(sg_date($n['published_on'])); ?></em>
                        </span>
                        <span class="chip chip--<?php echo $n['is_published'] ? 'on' : 'off'; ?>">
                            <?php echo $n['is_published'] ? 'Live' : 'Draft'; ?>
                        </span>
                        <a class="lnk" href="news.php?action=edit&amp;id=<?php echo (int) $n['id']; ?>">Edit</a>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </section>

</div>

<section class="card">
    <div class="card__head">
        <h2>Where this panel publishes</h2>
        <form method="post" action="publish.php">
            <?php echo sg_csrf_field(); ?>
            <button type="submit" class="btn btn--ghost btn--sm">Republish everything</button>
        </form>
    </div>

    <p class="card__note">
        Saving anything rewrites the matching section of the page listed below. Everything
        outside the <code>SG-CMS</code> marker comments in those files is left alone, so the
        rest of each page can still be edited by hand.
    </p>

    <table class="tbl">
        <thead>
            <tr><th>Section</th><th>File</th><th>State</th></tr>
        </thead>
        <tbody>
            <?php foreach ($health as $block => $h): ?>
                <tr>
                    <td><?php echo e($healthLabels[$block]); ?></td>
                    <td><code><?php echo e($h['file'] !== '' ? $h['file'] : '—'); ?></code></td>
                    <td>
                        <span class="chip chip--<?php echo $h['state'] === 'ok' ? 'on' : 'warn'; ?>">
                            <?php echo $h['state'] === 'ok' ? 'Ready' : 'Attention'; ?>
                        </span>
                        <?php if ($h['state'] !== 'ok'): ?>
                            <span class="muted"><?php echo e($h['note']); ?></span>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</section>

<?php sg_admin_foot(); ?>
