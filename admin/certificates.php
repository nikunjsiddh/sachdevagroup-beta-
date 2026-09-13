<?php
/* ==========================================================================
   ADMIN — certificates
   ==========================================================================
   The certificate scans on our_credentials.html, and the pictures its
   lightbox opens.

   The six cards that page carried by hand are seeded into the table on the
   first request (includes/db.php), so this panel starts by showing what is
   already live rather than by emptying the section. From that first publish
   the table IS the section: add, retitle, reorder, hide or delete here and
   the page is rewritten as part of saving.

   Adding accepts several files at once — certification arrives as a set of
   scans, not one at a time — and the title typed above them is numbered
   across the batch so the cards do not all read the same.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';
sg_require_login();
require __DIR__ . '/_layout.php';

$action = sg_get('action', 'list');
$id     = sg_get_int('id');
$errors = array();

/* The label a scan falls back to when nothing usable was typed or could be
   read off the filename: "Certificate 07", numbered from what is already
   there rather than from the row id, which would leave gaps after a delete. */
function sg_cert_label($n) {
    return 'Certificate ' . str_pad((string) $n, 2, '0', STR_PAD_LEFT);
}

/* --------------------------------------------------------------------------
   Writes
   -------------------------------------------------------------------------- */

if (sg_is_post()) {
    sg_csrf_check();
    $do = sg_post('do');

    /* ---------- add, one or many ---------- */
    if ($do === 'add') {
        $title   = sg_post('title');
        $caption = sg_post('caption');
        $live    = sg_post_int('is_published') === 1 ? 1 : 0;

        if (mb_strlen($title) > 120)   $errors[] = 'The title is too long (120 characters maximum).';
        if (mb_strlen($caption) > 200) $errors[] = 'The lightbox caption is too long (200 characters maximum).';

        if (!$errors) {
            $result = sg_upload_images('images', 'certificates');
            $errors = $result['errors'];

            if ($result['saved']) {
                $next  = (int) sg_val('SELECT MAX(sort_order) FROM sg_certificates', array(), 0);
                $n     = (int) sg_val('SELECT COUNT(*) FROM sg_certificates', array(), 0);
                $now   = date('Y-m-d H:i:s');
                $many  = count($result['saved']) > 1;
                $st    = sg_db()->prepare('INSERT INTO sg_certificates
                        (title, caption, image, is_published, sort_order, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)');

                foreach ($result['saved'] as $i => $file) {
                    $next += 10;
                    $n++;

                    /* One file takes the title exactly as typed. Several take
                       it numbered — "ISO 9001:2015 01", "…02" — because six
                       cards all reading the same line is worse than a number
                       somebody edits away. */
                    if ($title !== '') {
                        $label = $many
                            ? $title . ' ' . str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT)
                            : $title;
                    } else {
                        $label = sg_title_from_filename($file['name']);
                        if ($label === '') $label = sg_cert_label($n);
                    }

                    $st->execute(array($label, $caption, $file['path'], $live, $next, $now, $now));
                }

                $c = count($result['saved']);
                sg_flash('ok', $c . ($c === 1 ? ' certificate was' : ' certificates were') . ' added'
                    . ($live ? ' and published to the credentials page.' : ' and left hidden.'));
                sg_publish_after_save('certificates');
            }

            if (!$result['saved'] && !$errors) {
                sg_flash('warn', 'No file was chosen.');
            }
        }

        foreach ($errors as $err) sg_flash('error', $err);
        sg_redirect('certificates.php');
    }

    /* ---------- delete ---------- */
    if ($do === 'delete') {
        $row = sg_one('SELECT * FROM sg_certificates WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            sg_run('DELETE FROM sg_certificates WHERE id = ?', array($row['id']));
            sg_delete_upload($row['image']);
            sg_flash('ok', 'Removed “' . $row['title'] . '” from the credentials page.');
            sg_publish_after_save('certificates');
        }
        sg_redirect('certificates.php');
    }

    /* ---------- show / hide ---------- */
    if ($do === 'toggle') {
        $row = sg_one('SELECT * FROM sg_certificates WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            $now = (int) $row['is_published'] === 1 ? 0 : 1;
            sg_run('UPDATE sg_certificates SET is_published = ?, updated_at = ? WHERE id = ?',
                array($now, date('Y-m-d H:i:s'), $row['id']));
            sg_publish_after_save('certificates');
        }
        sg_redirect('certificates.php');
    }

    /* ---------- order ---------- */
    if ($do === 'move') {
        $row = sg_one('SELECT * FROM sg_certificates WHERE id = ?', array(sg_post_int('id')));
        $dir = sg_post('dir') === 'up' ? 'up' : 'down';

        if ($row) {
            $all = sg_all('SELECT id FROM sg_certificates ORDER BY sort_order ASC, id ASC');
            $at = null;
            foreach ($all as $i => $r) if ((int) $r['id'] === (int) $row['id']) { $at = $i; break; }
            $to = $dir === 'up' ? $at - 1 : $at + 1;

            if ($at !== null && isset($all[$to])) {
                /* The whole column is rewritten rather than two values being
                   swapped: rows that share a sort_order cannot be reordered by
                   a swap, because the swap changes nothing. */
                $order = $all;
                $moved = array_splice($order, $at, 1);
                array_splice($order, $to, 0, $moved);

                $st = sg_db()->prepare('UPDATE sg_certificates SET sort_order = ? WHERE id = ?');
                foreach ($order as $i => $r) $st->execute(array(($i + 1) * 10, $r['id']));

                sg_publish_after_save('certificates');
            }
        }
        sg_redirect('certificates.php');
    }

    /* ---------- edit one ---------- */
    if ($do === 'save') {
        $id  = sg_post_int('id');
        $row = sg_one('SELECT * FROM sg_certificates WHERE id = ?', array($id));

        if (!$row) {
            sg_flash('error', 'That certificate no longer exists.');
            sg_redirect('certificates.php');
        }

        $title   = sg_post('title');
        $caption = sg_post('caption');
        $live    = sg_post_int('is_published') === 1 ? 1 : 0;
        $image   = $row['image'];

        if ($title === '')             $errors[] = 'Please give the certificate a title.';
        if (mb_strlen($title) > 120)   $errors[] = 'The title is too long (120 characters maximum).';
        if (mb_strlen($caption) > 200) $errors[] = 'The lightbox caption is too long (200 characters maximum).';

        $upErr = '';
        $newImage = sg_upload_image('image', 'certificates', $upErr);
        if ($newImage !== '') {
            $image = $newImage;
        } elseif ($upErr !== '' && $upErr !== 'no-file') {
            $errors[] = $upErr;
        }

        if (!$errors) {
            sg_run('UPDATE sg_certificates SET title = ?, caption = ?, image = ?,
                    is_published = ?, updated_at = ? WHERE id = ?',
                array($title, $caption, $image, $live, date('Y-m-d H:i:s'), $row['id']));

            if ($row['image'] !== '' && $row['image'] !== $image) {
                sg_delete_upload($row['image']);
            }

            sg_flash('ok', 'Saved “' . $title . '”.');
            sg_publish_after_save('certificates');
            sg_redirect('certificates.php');
        }

        $action = 'edit';
        $item = array('id' => $id, 'title' => $title, 'caption' => $caption,
                      'image' => $image, 'is_published' => $live);
    }
}

/* --------------------------------------------------------------------------
   Edit one certificate
   -------------------------------------------------------------------------- */

if ($action === 'edit') {

    if (!isset($item)) {
        $item = sg_one('SELECT * FROM sg_certificates WHERE id = ?', array($id));
        if (!$item) {
            sg_flash('error', 'That certificate no longer exists.');
            sg_redirect('certificates.php');
        }
    }

    sg_admin_head('Edit certificate', 'certificates.php');
    ?>

    <?php if ($errors): ?>
        <div class="note note--error" role="alert">
            <?php foreach ($errors as $i => $err): ?>
                <?php echo $i ? '<br>' : ''; ?><?php echo e($err); ?>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <form method="post" action="certificates.php" enctype="multipart/form-data" class="card form">
        <?php echo sg_csrf_field(); ?>
        <input type="hidden" name="do" value="save">
        <input type="hidden" name="id" value="<?php echo (int) $item['id']; ?>">

        <div class="form__grid">

            <div class="field field--wide">
                <span>Scan</span>
                <div class="thumbrow">
                    <img class="thumb thumb--lg" src="../<?php echo e($item['image']); ?>" alt="">
                </div>
                <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif">
                <small class="hint">
                    Leave this empty to keep the scan above. Up to
                    <?php echo e(sg_bytes(sg_effective_max_upload())); ?>.
                </small>
            </div>

            <label class="field field--wide">
                <span>Title <em>printed across the foot of the card</em></span>
                <input type="text" name="title" value="<?php echo e($item['title']); ?>"
                       maxlength="120" required autofocus>
            </label>

            <label class="field field--wide">
                <span>Lightbox caption <em>optional — the title is used when this is empty</em></span>
                <input type="text" name="caption" value="<?php echo e($item['caption']); ?>" maxlength="200">
            </label>

            <label class="check check--box field--wide">
                <input type="checkbox" name="is_published" value="1"
                       <?php echo (int) $item['is_published'] === 1 ? 'checked' : ''; ?>>
                <span>Show on the credentials page<em>Unticked, it stays here but is not published.</em></span>
            </label>

        </div>

        <div class="form__foot">
            <button type="submit" class="btn btn--primary">Save changes</button>
            <a class="btn btn--ghost" href="certificates.php">Cancel</a>
        </div>
    </form>

    <?php
    sg_admin_foot();
    exit;
}

/* --------------------------------------------------------------------------
   The list
   -------------------------------------------------------------------------- */

$rows = sg_all('SELECT * FROM sg_certificates ORDER BY sort_order ASC, id ASC');
$last = count($rows) - 1;

sg_admin_head('Certificates', 'certificates.php');
?>

<div class="pagehead">
    <p>
        The certificate scans on
        <a href="../our_credentials.html#certificates" target="_blank" rel="noopener">our_credentials.html</a>,
        in the order they appear. Each one opens full size in the lightbox.
    </p>
</div>

<form method="post" action="certificates.php" enctype="multipart/form-data"
      class="card form form--add" id="drop">
    <?php echo sg_csrf_field(); ?>
    <input type="hidden" name="do" value="add">

    <div class="card__head">
        <h2>Add a certificate</h2>
    </div>

    <div class="form__grid">

        <div class="field field--wide">
            <span>Scan <em>choose several at once and each becomes its own card</em></span>
            <input type="file" name="images[]" id="dropInput" multiple
                   accept="image/jpeg,image/png,image/webp,image/gif" required>
            <p class="drop__picked" id="dropPicked" hidden></p>
            <small class="hint">
                JPG, PNG, WebP or GIF, up to <?php echo e(sg_bytes(sg_effective_max_upload())); ?> each.
                A portrait scan around 1000&times;1400 fits the card best.
            </small>
        </div>

        <label class="field">
            <span>Title <em>printed across the foot of the card</em></span>
            <input type="text" name="title" maxlength="120" placeholder="ISO 9001:2015">
        </label>

        <label class="field">
            <span>Lightbox caption <em>optional — the title is used when this is empty</em></span>
            <input type="text" name="caption" maxlength="200">
        </label>

        <label class="check check--box field--wide">
            <input type="checkbox" name="is_published" value="1" checked>
            <span>Show on the credentials page<em>Unticked, it is kept here and does not appear
                on our_credentials.html until you tick it.</em></span>
        </label>

    </div>

    <div class="form__foot">
        <button type="submit" class="btn btn--primary">Add certificate</button>
        <small class="hint">
            Left empty, the title is taken from the filename. Choosing more than one file
            numbers the title across the batch.
        </small>
    </div>
</form>

<?php if (!$rows): ?>
    <div class="card empty-card">
        <h2>No certificates yet</h2>
        <p>Upload the first scan above. Until then the credentials page shows a
            &ldquo;nothing published yet&rdquo; note in place of the grid.</p>
    </div>
<?php else: ?>
    <div class="grid">
        <?php foreach ($rows as $i => $r): ?>
            <figure class="shot<?php echo (int) $r['is_published'] === 1 ? '' : ' shot--off'; ?>">
                <img src="../<?php echo e($r['image']); ?>" alt="<?php echo e($r['title']); ?>" loading="lazy">

                <figcaption>
                    <strong><?php echo e($r['title']); ?></strong>
                    <span class="muted"><?php echo e($r['image']); ?></span>
                </figcaption>

                <div class="shot__bar">
                    <form method="post" action="certificates.php" class="inline">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="move">
                        <input type="hidden" name="dir" value="up">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="icon" aria-label="Move earlier"
                            <?php echo $i === 0 ? 'disabled' : ''; ?>>&larr;</button>
                    </form>
                    <form method="post" action="certificates.php" class="inline">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="move">
                        <input type="hidden" name="dir" value="down">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="icon" aria-label="Move later"
                            <?php echo $i === $last ? 'disabled' : ''; ?>>&rarr;</button>
                    </form>

                    <form method="post" action="certificates.php" class="inline">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="toggle">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="chip chip--<?php echo $r['is_published'] ? 'on' : 'off'; ?> chip--btn"
                                title="<?php echo $r['is_published'] ? 'Hide from the credentials page' : 'Show on the credentials page'; ?>">
                            <?php echo $r['is_published'] ? 'Live' : 'Hidden'; ?>
                        </button>
                    </form>

                    <a class="lnk" href="certificates.php?action=edit&amp;id=<?php echo (int) $r['id']; ?>">Edit</a>

                    <form method="post" action="certificates.php" class="inline"
                          data-confirm="Delete “<?php echo e($r['title']); ?>”? The picture file is deleted too.">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="delete">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="lnk lnk--danger">Delete</button>
                    </form>
                </div>
            </figure>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php sg_admin_foot(); ?>
