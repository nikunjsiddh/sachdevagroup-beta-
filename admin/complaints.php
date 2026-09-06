<?php
/* ==========================================================================
   ADMIN — complaints
   ==========================================================================
   The postbag from "Tell us how we did" on the website: whatever a worker,
   visitor or customer typed, complaints included, with the mobile number they
   left and the address it was sent from.

   NOTHING HERE IS PUBLISHED, EVER. That is the whole reason this page is not
   Testimonials. A message sent to the office is correspondence: it is read,
   it is answered, and it is marked resolved. It is not the company's opinion
   of itself, and putting a stranger's text on the About page because somebody
   pressed Approve is exactly the mistake the old single list made easy.

   A note somebody does want to print is copied across with "Use as
   testimonial", which opens the testimonial form with the words filled in and
   the publish box UNTICKED — so printing it is still a second, deliberate
   decision.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';
sg_require_login();
require __DIR__ . '/_layout.php';

$statuses = array('new', 'resolved');
$labels   = array('new' => 'Open', 'resolved' => 'Resolved');

$status = sg_get('status', 'new');
if (!in_array($status, $statuses, true)) $status = 'new';

$action = sg_get('action', 'list');
$id     = sg_get_int('id');
$errors = array();
$types  = array('Workers', 'Visitors', 'Customers');

/* --------------------------------------------------------------------------
   Writes
   -------------------------------------------------------------------------- */

if (sg_is_post()) {
    sg_csrf_check();
    $do   = sg_post('do');
    $back = 'complaints.php?status=' . rawurlencode(sg_post('back', $status));

    /* ---------- resolve / reopen ---------- */
    if ($do === 'status') {
        $row  = sg_one('SELECT * FROM sg_complaints WHERE id = ?', array(sg_post_int('id')));
        $want = sg_post('to');

        if ($row && in_array($want, $statuses, true)) {
            $user = sg_user();
            sg_run('UPDATE sg_complaints SET status = ?, handled_at = ?, handled_by = ?
                    WHERE id = ?',
                array($want, date('Y-m-d H:i:s'), $user['username'], $row['id']));

            sg_flash('ok', 'The note from ' . sg_excerpt($row['name'], 40) . ' was '
                . ($want === 'resolved' ? 'marked resolved.' : 'reopened.'));
        }
        sg_redirect($back);
    }

    /* ---------- delete ---------- */
    if ($do === 'delete') {
        $row = sg_one('SELECT * FROM sg_complaints WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            sg_run('DELETE FROM sg_complaints WHERE id = ?', array($row['id']));
            sg_flash('ok', 'Deleted the note from ' . $row['name'] . '.');
        }
        sg_redirect($back);
    }

    /* ---------- record one that came by phone or in person ---------- */
    if ($do === 'save') {
        $id  = sg_post_int('id');
        $row = $id ? sg_one('SELECT * FROM sg_complaints WHERE id = ?', array($id)) : null;

        $name   = sg_post('name');
        $role   = sg_post('designation');
        $type   = sg_post('feedback_type');
        $mobile = sg_post('mobile');
        $note   = sg_post_text('note');
        $want   = sg_post('status');

        if (!in_array($want, $statuses, true)) $want = 'new';
        if ($type === '') $type = 'Visitors';

        if ($name === '')            $errors[] = 'Please enter who this is from.';
        if (mb_strlen($name) > 90)   $errors[] = 'That name is too long (90 characters maximum).';
        if ($note === '')            $errors[] = 'Please enter what they said.';
        if (mb_strlen($note) > 900)  $errors[] = 'The note is too long (900 characters maximum).';

        if (!$errors) {
            $user = sg_user();
            $now  = date('Y-m-d H:i:s');

            if ($row) {
                sg_run('UPDATE sg_complaints SET feedback_type = ?, name = ?, designation = ?,
                        mobile = ?, note = ?, status = ?, handled_at = ?, handled_by = ?
                        WHERE id = ?',
                    array($type, $name, $role, $mobile, $note, $want, $now,
                          $user['username'], $row['id']));
                sg_flash('ok', 'Saved the note from ' . $name . '.');
            } else {
                sg_run('INSERT INTO sg_complaints
                        (feedback_type, name, designation, mobile, note, status, source, ip,
                         submitted_at, handled_at, handled_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    array($type, $name, $role, $mobile, $note, $want, 'admin', '',
                          $now, $now, $user['username']));
                sg_flash('ok', 'Recorded the note from ' . $name . '.');
            }

            sg_redirect('complaints.php?status=' . rawurlencode($want));
        }

        $action = $id ? 'edit' : 'new';
        $item = array('id' => $id, 'feedback_type' => $type, 'name' => $name,
                      'designation' => $role, 'mobile' => $mobile, 'note' => $note,
                      'status' => $want, 'source' => 'admin', 'submitted_at' => '',
                      'ip' => '', 'handled_by' => '', 'handled_at' => '');
    }
}

/* --------------------------------------------------------------------------
   Add / edit form
   -------------------------------------------------------------------------- */

if ($action === 'new' || $action === 'edit') {

    if (!isset($item)) {
        if ($action === 'edit') {
            $item = sg_one('SELECT * FROM sg_complaints WHERE id = ?', array($id));
            if (!$item) {
                sg_flash('error', 'That note no longer exists.');
                sg_redirect('complaints.php');
            }
        } else {
            $item = array('id' => 0, 'feedback_type' => 'Visitors', 'name' => '',
                          'designation' => '', 'mobile' => '', 'note' => '',
                          'status' => 'new', 'source' => 'admin', 'submitted_at' => '',
                          'ip' => '', 'handled_by' => '', 'handled_at' => '');
        }
    }

    sg_admin_head($action === 'new' ? 'Record a note' : 'Edit note', 'complaints.php');
    ?>

    <?php if ($errors): ?>
        <div class="note note--error" role="alert">
            <?php foreach ($errors as $i => $err): ?>
                <?php echo $i ? '<br>' : ''; ?><?php echo e($err); ?>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <?php if ($action === 'edit' && $item['source'] === 'website'): ?>
        <div class="note note--info">
            This note came through the website form<?php
                echo $item['submitted_at'] !== '' ? ' on ' . e(sg_date($item['submitted_at'], 'd M Y, g:i a')) : ''; ?>.
            Editing it changes the office's record of what was sent.
        </div>
    <?php endif; ?>

    <form method="post" action="complaints.php" class="card form">
        <?php echo sg_csrf_field(); ?>
        <input type="hidden" name="do" value="save">
        <input type="hidden" name="id" value="<?php echo (int) $item['id']; ?>">

        <div class="form__grid">

            <label class="field">
                <span>Name</span>
                <input type="text" name="name" value="<?php echo e($item['name']); ?>"
                       maxlength="90" required autofocus>
            </label>

            <label class="field">
                <span>Designation <em>optional</em></span>
                <input type="text" name="designation" value="<?php echo e($item['designation']); ?>"
                       maxlength="90">
            </label>

            <label class="field">
                <span>Feedback from</span>
                <input type="text" name="feedback_type" value="<?php echo e($item['feedback_type']); ?>"
                       maxlength="40" list="sg-types">
                <datalist id="sg-types">
                    <?php foreach ($types as $t): ?>
                        <option value="<?php echo e($t); ?>"></option>
                    <?php endforeach; ?>
                </datalist>
            </label>

            <label class="field">
                <span>Mobile <em>how to reach them — never published</em></span>
                <input type="text" name="mobile" value="<?php echo e($item['mobile']); ?>" maxlength="24">
            </label>

            <label class="field field--wide">
                <span>What they said</span>
                <textarea name="note" rows="5" maxlength="900" required><?php echo e($item['note']); ?></textarea>
            </label>

            <label class="field">
                <span>State</span>
                <select name="status">
                    <option value="new" <?php echo $item['status'] === 'new' ? 'selected' : ''; ?>>
                        Open — still to be dealt with</option>
                    <option value="resolved" <?php echo $item['status'] === 'resolved' ? 'selected' : ''; ?>>
                        Resolved — answered or closed</option>
                </select>
            </label>

        </div>

        <div class="form__foot">
            <button type="submit" class="btn btn--primary">
                <?php echo $action === 'new' ? 'Record it' : 'Save changes'; ?>
            </button>
            <a class="btn btn--ghost" href="complaints.php?status=<?php echo e($status); ?>">Cancel</a>
        </div>
    </form>

    <?php
    sg_admin_foot();
    exit;
}

/* --------------------------------------------------------------------------
   The list
   -------------------------------------------------------------------------- */

$counts = array();
foreach ($statuses as $s) {
    $counts[$s] = (int) sg_val('SELECT COUNT(*) FROM sg_complaints WHERE status = ?', array($s), 0);
}

$rows = sg_all('SELECT * FROM sg_complaints WHERE status = ? ORDER BY id DESC', array($status));

sg_admin_head('Complaints', 'complaints.php');
?>

<div class="pagehead">
    <p>
        Everything sent through the feedback form on the website arrives here.
        None of it is published — it is the office's record, and it is answered
        and then marked resolved. A note worth printing is copied across to
        <a href="testimonials.php">Testimonials</a>.
    </p>
    <a class="btn btn--primary" href="complaints.php?action=new">Record a note</a>
</div>

<nav class="tabs" aria-label="Filter by state">
    <?php foreach ($statuses as $s): ?>
        <a href="complaints.php?status=<?php echo e($s); ?>"
           class="<?php echo $s === $status ? 'is-on' : ''; ?>"
           <?php echo $s === $status ? 'aria-current="page"' : ''; ?>>
            <?php echo e($labels[$s]); ?>
            <b><?php echo (int) $counts[$s]; ?></b>
        </a>
    <?php endforeach; ?>
</nav>

<?php if (!$rows): ?>
    <div class="card empty-card">
        <h2>Nothing here</h2>
        <p>
            <?php if ($status === 'new'): ?>
                Nothing is waiting. Notes sent through the feedback form on the website
                appear here as soon as they arrive, whether or not the email goes out.
            <?php else: ?>
                Notes are kept here after they have been dealt with, rather than deleted,
                so what was said and when can still be looked up.
            <?php endif; ?>
        </p>
    </div>
<?php else: ?>
    <div class="notes">
        <?php foreach ($rows as $r): ?>
            <article class="fb" id="c<?php echo (int) $r['id']; ?>">

                <header class="fb__head">
                    <span class="fb__av"><?php echo e(sg_initials($r['name'], 2)); ?></span>

                    <span class="fb__who">
                        <strong><?php echo e($r['name']); ?></strong>
                        <em>
                            <?php echo e($r['feedback_type']); ?><?php
                                echo $r['designation'] !== '' ? ' · ' . e($r['designation']) : ''; ?>
                            <?php if ($r['submitted_at'] !== ''): ?>
                                · <?php echo e(sg_date($r['submitted_at'], 'd M Y, g:i a')); ?>
                            <?php endif; ?>
                            <?php if ($r['source'] === 'website'): ?>
                                · <span class="tag">from the website form</span>
                            <?php endif; ?>
                        </em>
                    </span>
                </header>

                <p class="fb__note"><?php echo nl2br(e($r['note'])); ?></p>

                <?php if ($r['mobile'] !== '' || $r['ip'] !== '' || $r['handled_by'] !== ''): ?>
                    <p class="fb__meta">
                        <?php if ($r['mobile'] !== ''): ?>Mobile <?php echo e($r['mobile']); ?><?php endif; ?>
                        <?php echo $r['ip'] !== '' ? ' · sent from ' . e($r['ip']) : ''; ?>
                        <?php if ($r['status'] === 'resolved' && $r['handled_by'] !== ''): ?>
                            · resolved by <?php echo e($r['handled_by']); ?><?php
                                echo $r['handled_at'] !== '' ? ' on ' . e(sg_date($r['handled_at'], 'd M Y')) : ''; ?>
                        <?php endif; ?>
                    </p>
                <?php endif; ?>

                <footer class="fb__bar">
                    <?php if ($r['status'] === 'new'): ?>
                        <form method="post" action="complaints.php" class="inline">
                            <?php echo sg_csrf_field(); ?>
                            <input type="hidden" name="do" value="status">
                            <input type="hidden" name="to" value="resolved">
                            <input type="hidden" name="back" value="<?php echo e($status); ?>">
                            <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                            <button type="submit" class="btn btn--primary btn--sm">Mark resolved</button>
                        </form>
                    <?php else: ?>
                        <form method="post" action="complaints.php" class="inline">
                            <?php echo sg_csrf_field(); ?>
                            <input type="hidden" name="do" value="status">
                            <input type="hidden" name="to" value="new">
                            <input type="hidden" name="back" value="<?php echo e($status); ?>">
                            <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                            <button type="submit" class="btn btn--ghost btn--sm">Reopen</button>
                        </form>
                    <?php endif; ?>

                    <a class="lnk" href="testimonials.php?action=new&amp;name=<?php
                            echo rawurlencode($r['name']); ?>&amp;designation=<?php
                            echo rawurlencode($r['designation']); ?>&amp;note=<?php
                            echo rawurlencode($r['note']); ?>"
                       title="Open the testimonial form with these words filled in. Nothing is published until you tick the box there.">
                        Use as testimonial</a>

                    <a class="lnk" href="complaints.php?action=edit&amp;id=<?php echo (int) $r['id']; ?>">Edit</a>

                    <form method="post" action="complaints.php" class="inline"
                          data-confirm="Delete the note from <?php echo e($r['name']); ?>? This cannot be undone.">
                        <?php echo sg_csrf_field(); ?>
                        <input type="hidden" name="do" value="delete">
                        <input type="hidden" name="back" value="<?php echo e($status); ?>">
                        <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                        <button type="submit" class="lnk lnk--danger">Delete</button>
                    </form>
                </footer>

            </article>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php sg_admin_foot(); ?>
