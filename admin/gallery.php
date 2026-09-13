<?php
/* ==========================================================================
   ADMIN — gallery
   ==========================================================================
   The tiles on gallery.html, and the pictures the lightbox opens.

   Adding is a multiple-file upload rather than one form per photograph: a
   yard visit produces a dozen pictures at once, and twelve round trips
   through a form is the difference between a panel somebody uses and one they
   ask a developer to do for them.

   The caption and the lightbox line are asked for ON THE ADD FORM, not only
   afterwards on the edit form. This card used to be a bare file input, which
   published every new tile under a caption guessed from its filename —
   “Img 4471” across the front of a photograph on a live page — and gave
   nobody anywhere to say otherwise until they noticed and went back to edit
   it. Both fields stay optional and the filename guess is still the fallback,
   so dropping twelve pictures in at once is no slower than it was.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';
sg_require_login();
require __DIR__ . '/_layout.php';

$action = sg_get('action', 'list');
$id     = sg_get_int('id');
$errors = array();

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

        if (mb_strlen($title) > 120)   $errors[] = 'The caption is too long (120 characters maximum).';
        if (mb_strlen($caption) > 200) $errors[] = 'The lightbox caption is too long (200 characters maximum).';

        /* Nothing is stored when the text is wrong, so nothing is moved out of
           the upload folder either — half a save is worse than none. */
        if (!$errors) {
            $result = sg_upload_images('images', 'gallery');
            $errors = $result['errors'];

            if ($result['saved']) {
                $next = (int) sg_val('SELECT MAX(sort_order) FROM sg_gallery', array(), 0);
                $now  = date('Y-m-d H:i:s');
                $many = count($result['saved']) > 1;
                $st   = sg_db()->prepare('INSERT INTO sg_gallery
                        (title, caption, image, is_published, sort_order, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)');

                $n = (int) sg_val('SELECT COUNT(*) FROM sg_gallery', array(), 0);

                foreach ($result['saved'] as $i => $file) {
                    $next += 10;
                    $n++;

                    /* One picture takes the caption exactly as typed. Several
                       take it numbered — “Beaching 01”, “Beaching 02” —
                       because a dozen tiles reading the same line is worse
                       than a number somebody edits away. Typed nothing, it is
                       the filename guess and then a placeholder, as before. */
                    if ($title !== '') {
                        $label = $many
                            ? $title . ' ' . str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT)
                            : $title;
                    } else {
                        $label = sg_title_from_filename($file['name']);
                        if ($label === '') $label = 'Yard photograph ' . $n;
                    }

                    $st->execute(array($label, $caption, $file['path'], $live, $next, $now, $now));
                }

                $c = count($result['saved']);
                sg_flash('ok', $c . ($c === 1 ? ' photograph was' : ' photographs were') . ' added'
                    . ($live ? ' to the gallery page.' : ' and left hidden.')
                    . ($title === '' ? ' The captions were taken from the filenames — check them below.' : ''));
                sg_publish_after_save('gallery');
            }

            if (!$result['saved'] && !$errors) {
                sg_flash('warn', 'No file was chosen.');
            }
        }

        foreach ($errors as $err) sg_flash('error', $err);
        sg_redirect('gallery.php');
    }

    /* ---------- delete ---------- */
    if ($do === 'delete') {
        $row = sg_one('SELECT * FROM sg_gallery WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            sg_run('DELETE FROM sg_gallery WHERE id = ?', array($row['id']));
            sg_delete_upload($row['image']);
            sg_flash('ok', 'Removed “' . $row['title'] . '” from the gallery.');
            sg_publish_after_save('gallery');
        }
        sg_redirect('gallery.php');
    }

    /* ---------- show / hide ---------- */
    if ($do === 'toggle') {
        $row = sg_one('SELECT * FROM sg_gallery WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            $now = (int) $row['is_published'] === 1 ? 0 : 1;
            sg_run('UPDATE sg_gallery SET is_published = ?, updated_at = ? WHERE id = ?',
                array($now, date('Y-m-d H:i:s'), $row['id']));
            sg_publish_after_save('gallery');
        }
        sg_redirect('gallery.php');
    }

    /* ---------- order ---------- */
    if ($do === 'move') {
        $row = sg_one('SELECT * FROM sg_gallery WHERE id = ?', array(sg_post_int('id')));
        $dir = sg_post('dir') === 'up' ? 'up' : 'down';

        if ($row) {
            $all = sg_all('SELECT id FROM sg_gallery ORDER BY sort_order ASC, id ASC');
            $at = null;
            foreach ($all as $i => $r) if ((int) $r['id'] === (int) $row['id']) { $at = $i; break; }
            $to = $dir === 'up' ? $at - 1 : $at + 1;

            if ($at !== null && isset($all[$to])) {
                $order = $all;
                $moved = array_splice($order, $at, 1);
                array_splice($order, $to, 0, $moved);

                $st = sg_db()->prepare('UPDATE sg_gallery SET sort_order = ? WHERE id = ?');
                foreach ($order as $i => $r) $st->execute(array(($i + 1) * 10, $r['id']));

                sg_publish_after_save('gallery');
            }
        }
        sg_redirect('gallery.php');
    }

    /* ---------- edit one ---------- */
    if ($do === 'save') {
        $id  = sg_post_int('id');
        $row = sg_one('SELECT * FROM sg_gallery WHERE id = ?', array($id));

        if (!$row) {
            sg_flash('error', 'That photograph no longer exists.');
            sg_redirect('gallery.php');
        }

        $title   = sg_post('title');
        $caption = sg_post('caption');
        $live    = sg_post_int('is_published') === 1 ? 1 : 0;
        $image   = $row['image'];

        if ($title === '')           $errors[] = 'Please give the photograph a caption.';
        if (mb_strlen($title) > 120) $errors[] = 'The caption is too long (120 characters maximum).';

        $upErr = '';
        $newImage = sg_upload_image('image', 'gallery', $upErr);
        if ($newImage !== '') {
            $image = $newImage;
        } elseif ($upErr !== '' && $upErr !== 'no-file') {
            $errors[] = $upErr;
        }

        if (!$errors) {
            sg_run('UPDATE sg_gallery SET title = ?, caption = ?, image = ?,
                    is_published = ?, updated_at = ? WHERE id = ?',
                array($title, $caption, $image, $live, date('Y-m-d H:i:s'), $row['id']));

            if ($row['image'] !== '' && $row['image'] !== $image) {
                sg_delete_upload($row['image']);
            }

            sg_flash('ok', 'Saved “' . $title . '”.');
            sg_publish_after_save('gallery');
            sg_redirect('gallery.php');
        }

        $action = 'edit';
        $item = array('id' => $id, 'title' => $title, 'caption' => $caption,
                      'image' => $image, 'is_published' => $live);
    }
}

/* --------------------------------------------------------------------------
   Edit one photograph
   -------------------------------------------------------------------------- */

if ($action === 'edit') {

    if (!isset($item)) {
        $item = sg_one('SELECT * FROM sg_gallery WHERE id = ?', array($id));
        if (!$item) {
            sg_flash('error', 'That photograph no longer exists.');
            sg_redirect('gallery.php');
        }
    }

    sg_admin_head('Edit photograph', 'gallery.php');
    ?>

    <?php if ($errors): ?>
        <div class="note note--error" role="alert">
            <?php foreach ($errors as $i => $err): ?>
                <?php echo $i ? '<br>' : ''; ?><?php echo e($err); ?>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <form method="post" action="gallery.php" enctype="multipart/form-data" class="card form">
        <?php echo sg_csrf_field(); ?>
        <input type="hidden" name="do" value="save">
        <input type="hidden" name="id" value="<?php echo (int) $item['id']; ?>">

        <div class="form__grid">

            <div class="field field--wide">
                <span>Picture</span>
                <div class="thumbrow">
                    <img class="thumb thumb--lg" src="../<?php echo e($item['image']); ?>" alt="">
                </div>
                <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif">
                <small class="hint">
                    Leave this empty to keep the picture above. Up to
                    <?php echo e(sg_bytes(sg_effective_max_upload())); ?>.
                </small>
            </div>

            <label class="field field--wide">
                <span>Caption <em>printed on the tile</em></span>
                <input type="text" name="title" value="<?php echo e($item['title']); ?>"
                       maxlength="120" required autofocus>
            </label>

            <label class="field field--wide">
                <span>Lightbox caption <em>optional — the tile caption is used when this is empty</em></span>
                <input type="text" name="caption" value="<?php echo e($item['caption']); ?>" maxlength="200">
            </label>

            <label class="check check--box field--wide">
                <input type="checkbox" name="is_published" value="1"
                       <?php echo (int) $item['is_published'] === 1 ? 'checked' : ''; ?>>
                <span>Show on the gallery page<em>Unticked, it stays here but is not published.</em></span>
            </label>

        </div>

        <div class="form__foot">
            <button type="submit" class="btn btn--primary">Save changes</button>
            <a class="btn btn--ghost" href="gallery.php">Cancel</a>
        </div>
    </form>

    <?php
    sg_admin_foot();
    exit;
}

/* --------------------------------------------------------------------------
   The list
   -------------------------------------------------------------------------- */

$rows = sg_all('SELECT * FROM sg_gallery ORDER BY sort_order ASC, id ASC');
$last = count($rows) - 1;

sg_admin_head('Gallery', 'gallery.php');
?>

<div class="pagehead">
    <p>
        The tiles on <a href="../gallery" target="_blank" rel="noopener">gallery.html</a>,
        in the order they appear. Each one opens full size in the lightbox.
    </p>
</div>

<form method="post" action="gallery.php" enctype="multipart/form-data"
      class="card form form--add" id="drop">
    <?php echo sg_csrf_field(); ?>
    <input type="hidden" name="do" value="add">

    <div class="card__head">
        <h2>Add photographs</h2>
    </div>

    <div class="form__grid">

        <div class="field field--wide">
            <span>Picture <em>choose several at once and each becomes its own tile</em></span>
            <input type="file" name="images[]" id="dropInput" multiple
                   accept="image/jpeg,image/png,image/webp,image/gif" required>
            <p class="drop__picked" id="dropPicked" hidden></p>
            <small class="hint">
                JPG, PNG, WebP or GIF, up to <?php echo e(sg_bytes(sg_effective_max_upload())); ?> each.
                A landscape picture around 1600&times;1200 fits the tile best.
            </small>
        </div>

        <label class="field">
            <span>Caption <em>printed on the tile</em></span>
            <input type="text" name="title" maxlength="120" placeholder="Primary Cutting Zone">
        </label>

        <label class="field">
            <span>Lightbox caption <em>optional — the tile caption is used when this is empty</em></span>
            <input type="text" name="caption" maxlength="200">
        </label>

        <label class="check check--box field--wide">
            <input type="checkbox" name="is_published" value="1" checked>
            <span>Show on the gallery page<em>Unticked, it is kept here and does not appear on
                gallery.html until you tick it.</em></span>
        </label>

    </div>

    <div class="form__foot">
        <button type="submit" class="btn btn--primary">Upload</button>
        <small class="hint">
            Left empty, the caption is taken from the filename. Choosing more than one file
            numbers the caption across the batch.
        </small>
    </div>
</form>

<?php if (!$rows): ?>
    <div class="card empty-card">
        <h2>The gallery is empty</h2>
        <p>Upload the first photographs above. Until then the gallery page shows a
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
                    <form method="post" action="gallery.php" class="inline">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="move">
                        <input type="hidden" name="dir" value="up">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="icon" aria-label="Move earlier"
                            <?php echo $i === 0 ? 'disabled' : ''; ?>>&larr;</button>
                    </form>
                    <form method="post" action="gallery.php" class="inline">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="move">
                        <input type="hidden" name="dir" value="down">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="icon" aria-label="Move later"
                            <?php echo $i === $last ? 'disabled' : ''; ?>>&rarr;</button>
                    </form>

                    <form method="post" action="gallery.php" class="inline">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="toggle">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="chip chip--<?php echo $r['is_published'] ? 'on' : 'off'; ?> chip--btn"
                                title="<?php echo $r['is_published'] ? 'Hide from the gallery page' : 'Show on the gallery page'; ?>">
                            <?php echo $r['is_published'] ? 'Live' : 'Hidden'; ?>
                        </button>
                    </form>

                    <a class="lnk" href="gallery.php?action=edit&amp;id=<?php echo (int) $r['id']; ?>">Edit</a>

                    <form method="post" action="gallery.php" class="inline"
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
