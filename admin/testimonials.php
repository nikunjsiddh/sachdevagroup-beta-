<?php
/* ==========================================================================
   ADMIN — client testimonials
   ==========================================================================
   The cards in the "In Their Words" section of about_us.html.

   A TESTIMONIAL IS NOT A PIECE OF FEEDBACK, WHICH IS WHY THIS IS NOT THAT
   PAGE. This is the company quoting somebody about itself: chosen, ordered by
   hand, and printed. What the website form collects is correspondence — it
   lives in Complaints, it is answered rather than published, and nothing
   there reaches this page unless somebody copies it across on purpose.

   The two used to share one table and one "approved" flag, which meant
   approving a complaint published it. They are separate now, and the only
   route from one to the other is the "Use as testimonial" button in
   Complaints, which lands here as an unpublished draft.
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

    /* ---------- delete ---------- */
    if ($do === 'delete') {
        $row = sg_one('SELECT * FROM sg_testimonials WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            sg_run('DELETE FROM sg_testimonials WHERE id = ?', array($row['id']));
            sg_flash('ok', 'Deleted the testimonial from ' . $row['name'] . '.');
            if ((int) $row['is_published'] === 1) sg_publish_after_save('testimonials');
        }
        sg_redirect('testimonials.php');
    }

    /* ---------- published / draft ---------- */
    if ($do === 'toggle') {
        $row = sg_one('SELECT * FROM sg_testimonials WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            $live = (int) $row['is_published'] === 1 ? 0 : 1;

            /* A draft being published goes to the end of the printed order,
               not to wherever its id happens to fall. */
            $sort = (int) $row['sort_order'];
            if ($live === 1) {
                $sort = (int) sg_val('SELECT MAX(sort_order) FROM sg_testimonials
                                      WHERE is_published = 1', array(), 0) + 10;
            }

            sg_run('UPDATE sg_testimonials SET is_published = ?, sort_order = ?, updated_at = ?
                    WHERE id = ?', array($live, $sort, date('Y-m-d H:i:s'), $row['id']));
            sg_flash('ok', '“' . sg_excerpt($row['name'], 40) . '” is '
                . ($live ? 'now on the About page.' : 'no longer on the About page.'));
            sg_publish_after_save('testimonials');
        }
        sg_redirect('testimonials.php');
    }

    /* ---------- order ---------- */
    if ($do === 'move') {
        $row = sg_one('SELECT * FROM sg_testimonials WHERE id = ?', array(sg_post_int('id')));
        $dir = sg_post('dir') === 'up' ? 'up' : 'down';

        if ($row) {
            $all = sg_all('SELECT id FROM sg_testimonials ORDER BY sort_order ASC, id ASC');
            $at = null;
            foreach ($all as $i => $r) if ((int) $r['id'] === (int) $row['id']) { $at = $i; break; }
            $to = $dir === 'up' ? $at - 1 : $at + 1;

            if ($at !== null && isset($all[$to])) {
                $order = $all;
                $moved = array_splice($order, $at, 1);
                array_splice($order, $to, 0, $moved);

                $st = sg_db()->prepare('UPDATE sg_testimonials SET sort_order = ? WHERE id = ?');
                foreach ($order as $i => $r) $st->execute(array(($i + 1) * 10, $r['id']));

                sg_publish_after_save('testimonials');
            }
        }
        sg_redirect('testimonials.php');
    }

    /* ---------- create / update ---------- */
    if ($do === 'save') {
        $id  = sg_post_int('id');
        $row = $id ? sg_one('SELECT * FROM sg_testimonials WHERE id = ?', array($id)) : null;

        $name     = sg_post('name');
        $role     = sg_post('designation');
        $note     = sg_post_text('note');
        $initials = mb_strtoupper(sg_post('initials'), 'UTF-8');
        $live     = sg_post_int('is_published') === 1 ? 1 : 0;

        if ($name === '')            $errors[] = 'Please enter the name to show on the card.';
        if (mb_strlen($name) > 90)   $errors[] = 'That name is too long (90 characters maximum).';
        if ($note === '')            $errors[] = 'Please enter what they said.';
        if (mb_strlen($note) > 900)  $errors[] = 'The testimonial is too long (900 characters maximum).';
        if ($initials !== '' && !preg_match('/^[\p{L}\p{N}]{1,4}$/u', $initials)) {
            $errors[] = 'The monogram may be up to four letters or numbers.';
        }

        if (!$errors) {
            if ($initials === '') $initials = sg_initials($name);
            $now = date('Y-m-d H:i:s');

            if ($row) {
                $sort = (int) $row['sort_order'];
                if ($live === 1 && (int) $row['is_published'] !== 1) {
                    $sort = (int) sg_val('SELECT MAX(sort_order) FROM sg_testimonials
                                          WHERE is_published = 1', array(), 0) + 10;
                }
                sg_run('UPDATE sg_testimonials SET name = ?, designation = ?, note = ?,
                        initials = ?, is_published = ?, sort_order = ?, updated_at = ?
                        WHERE id = ?',
                    array($name, $role, $note, $initials, $live, $sort, $now, $row['id']));
                sg_flash('ok', 'Saved the testimonial from ' . $name . '.');
            } else {
                $sort = (int) sg_val('SELECT MAX(sort_order) FROM sg_testimonials', array(), 0) + 10;
                sg_run('INSERT INTO sg_testimonials
                        (name, designation, note, initials, is_published, sort_order,
                         created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    array($name, $role, $note, $initials, $live, $sort, $now, $now));
                sg_flash('ok', 'Added the testimonial from ' . $name
                    . ($live ? ' to the About page.' : ' as a draft.'));
            }

            sg_publish_after_save('testimonials');
            sg_redirect('testimonials.php');
        }

        $action = $id ? 'edit' : 'new';
        $item = array('id' => $id, 'name' => $name, 'designation' => $role,
                      'note' => $note, 'initials' => $initials, 'is_published' => $live);
    }
}

/* --------------------------------------------------------------------------
   Add / edit form
   -------------------------------------------------------------------------- */

if ($action === 'new' || $action === 'edit') {

    if (!isset($item)) {
        if ($action === 'edit') {
            $item = sg_one('SELECT * FROM sg_testimonials WHERE id = ?', array($id));
            if (!$item) {
                sg_flash('error', 'That testimonial no longer exists.');
                sg_redirect('testimonials.php');
            }
        } else {
            /* Prefilled when it arrived from Complaints, so the note does not
               have to be retyped to be printed. */
            $item = array('id' => 0,
                          'name'        => sg_get('name'),
                          'designation' => sg_get('designation'),
                          'note'        => sg_get('note'),
                          'initials'    => '',
                          'is_published' => 0);
        }
    }

    sg_admin_head($action === 'new' ? 'Add a testimonial' : 'Edit testimonial', 'testimonials.php');
    ?>

    <?php if ($errors): ?>
        <div class="note note--error" role="alert">
            <?php foreach ($errors as $i => $err): ?>
                <?php echo $i ? '<br>' : ''; ?><?php echo e($err); ?>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <?php if ($action === 'new' && $item['note'] !== ''): ?>
        <div class="note note--info">
            Copied from a note in Complaints. Nothing is published until you tick
            <em>Show on the About page</em> below — check the wording first.
        </div>
    <?php endif; ?>

    <form method="post" action="testimonials.php" class="card form">
        <?php echo sg_csrf_field(); ?>
        <input type="hidden" name="do" value="save">
        <input type="hidden" name="id" value="<?php echo (int) $item['id']; ?>">

        <div class="form__grid">

            <label class="field">
                <span>Name <em>as it appears on the card</em></span>
                <input type="text" name="name" value="<?php echo e($item['name']); ?>"
                       maxlength="90" required autofocus>
            </label>

            <label class="field">
                <span>Designation <em>optional — printed after the name</em></span>
                <input type="text" name="designation" value="<?php echo e($item['designation']); ?>"
                       maxlength="90">
            </label>

            <label class="field field--wide">
                <span>What they said</span>
                <textarea name="note" rows="5" maxlength="900" required><?php echo e($item['note']); ?></textarea>
            </label>

            <label class="field">
                <span>Monogram <em>up to 4 letters — left empty it is taken from the name</em></span>
                <input type="text" name="initials" value="<?php echo e($item['initials']); ?>"
                       maxlength="4" style="text-transform:uppercase" spellcheck="false">
            </label>

            <label class="check check--box field--wide">
                <input type="checkbox" name="is_published" value="1"
                       <?php echo (int) $item['is_published'] === 1 ? 'checked' : ''; ?>>
                <span>Show on the About page<em>Unticked, it is kept here as a draft and does not
                    appear in the In Their Words section.</em></span>
            </label>

        </div>

        <div class="form__foot">
            <button type="submit" class="btn btn--primary">
                <?php echo $action === 'new' ? 'Add testimonial' : 'Save changes'; ?>
            </button>
            <a class="btn btn--ghost" href="testimonials.php">Cancel</a>
        </div>
    </form>

    <?php
    sg_admin_foot();
    exit;
}

/* --------------------------------------------------------------------------
   The list
   -------------------------------------------------------------------------- */

$rows = sg_all('SELECT * FROM sg_testimonials ORDER BY sort_order ASC, id ASC');
$last = count($rows) - 1;
$live = 0;
foreach ($rows as $r) if ((int) $r['is_published'] === 1) $live++;

sg_admin_head('Testimonials', 'testimonials.php');
?>

<div class="pagehead">
    <p>
        The cards in the
        <a href="../about_us.html#testimonials" target="_blank" rel="noopener">In Their Words</a>
        section of the About page, in this order.
        <?php echo (int) $live; ?> of <?php echo count($rows); ?>
        <?php echo count($rows) === 1 ? 'is' : 'are'; ?> published.
        Notes sent through the website form are in
        <a href="complaints.php">Complaints</a> and are never published from there.
    </p>
    <a class="btn btn--primary" href="testimonials.php?action=new">Add a testimonial</a>
</div>

<?php if (!$rows): ?>
    <div class="card empty-card">
        <h2>No testimonials yet</h2>
        <p>Until one is published the About page shows a &ldquo;nothing published yet&rdquo;
            note in place of the cards.</p>
        <a class="btn btn--primary" href="testimonials.php?action=new">Add a testimonial</a>
    </div>
<?php else: ?>
    <div class="notes">
        <?php foreach ($rows as $i => $r): ?>
            <article class="fb<?php echo (int) $r['is_published'] === 1 ? '' : ' fb--off'; ?>"
                     id="t<?php echo (int) $r['id']; ?>">

                <header class="fb__head">
                    <span class="fb__av"><?php
                        echo e($r['initials'] !== '' ? $r['initials'] : sg_initials($r['name'], 2)); ?></span>

                    <span class="fb__who">
                        <strong><?php echo e($r['name']); ?></strong>
                        <em>
                            <?php echo $r['designation'] !== '' ? e($r['designation']) . ' · ' : ''; ?>
                            <?php echo (int) $r['is_published'] === 1
                                ? 'card ' . str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) . ' on the About page'
                                : 'draft — not published'; ?>
                        </em>
                    </span>

                    <span class="fb__ord">
                        <form method="post" action="testimonials.php" class="inline">
                            <?php echo sg_csrf_field(); ?>
                            <input type="hidden" name="do" value="move">
                            <input type="hidden" name="dir" value="up">
                            <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                            <button type="submit" class="icon" aria-label="Move up"
                                <?php echo $i === 0 ? 'disabled' : ''; ?>>&uarr;</button>
                        </form>
                        <form method="post" action="testimonials.php" class="inline">
                            <?php echo sg_csrf_field(); ?>
                            <input type="hidden" name="do" value="move">
                            <input type="hidden" name="dir" value="down">
                            <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                            <button type="submit" class="icon" aria-label="Move down"
                                <?php echo $i === $last ? 'disabled' : ''; ?>>&darr;</button>
                        </form>
                    </span>
                </header>

                <p class="fb__note"><?php echo nl2br(e($r['note'])); ?></p>

                <footer class="fb__bar">
                    <form method="post" action="testimonials.php" class="inline">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="toggle">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="btn btn--sm <?php
                            echo (int) $r['is_published'] === 1 ? 'btn--ghost' : 'btn--primary'; ?>">
                            <?php echo (int) $r['is_published'] === 1
                                ? 'Remove from the page' : 'Publish to the About page'; ?>
                        </button>
                    </form>

                    <a class="lnk" href="testimonials.php?action=edit&amp;id=<?php echo (int) $r['id']; ?>">Edit</a>

                    <form method="post" action="testimonials.php" class="inline"
                          data-confirm="Delete the testimonial from <?php echo e($r['name']); ?>? This cannot be undone.">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="delete">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="lnk lnk--danger">Delete</button>
                    </form>
                </footer>

            </article>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php sg_admin_foot(); ?>
