<?php
/* ==========================================================================
   ADMIN — user feedback
   ==========================================================================
   The postbag from the website form, and the section it feeds on the About
   page.

   Nothing published here is automatic. A note posted through the form arrives
   as 'pending' and is invisible to the website until somebody approves it —
   the About page is the company speaking about itself, and an unmoderated
   feed of whatever strangers type into a form is not that.

   Approving, rejecting and reordering all rebuild about_us.html immediately,
   so the decision and its effect are the same action.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';
sg_require_login();
require __DIR__ . '/_layout.php';

$statuses = array('pending', 'approved', 'rejected');

$status = sg_get('status', 'pending');
if (!in_array($status, $statuses, true)) $status = 'pending';

$action = sg_get('action', 'list');
$id     = sg_get_int('id');
$errors = array();
$types  = array('Workers', 'Visitors', 'Customers', 'Class society', 'Ship manager', 'Inspector');

/* --------------------------------------------------------------------------
   Writes
   -------------------------------------------------------------------------- */

if (sg_is_post()) {
    sg_csrf_check();
    $do   = sg_post('do');
    $back = 'feedback.php?status=' . rawurlencode(sg_post('back', $status));

    /* ---------- approve / reject / return to pending ---------- */
    if ($do === 'status') {
        $row  = sg_one('SELECT * FROM sg_feedback WHERE id = ?', array(sg_post_int('id')));
        $want = sg_post('to');

        if ($row && in_array($want, $statuses, true)) {
            $user = sg_user();

            /* An approved note goes to the end of the published order, not to
               wherever its id happens to fall. */
            $sort = (int) $row['sort_order'];
            if ($want === 'approved' && $row['status'] !== 'approved') {
                $sort = (int) sg_val("SELECT MAX(sort_order) FROM sg_feedback WHERE status = 'approved'",
                    array(), 0) + 10;
            }

            sg_run('UPDATE sg_feedback SET status = ?, sort_order = ?, reviewed_at = ?, reviewed_by = ?
                    WHERE id = ?',
                array($want, $sort, date('Y-m-d H:i:s'), $user['username'], $row['id']));

            $said = array(
                'approved' => 'is now on the About page',
                'rejected' => 'was rejected and will not be published',
                'pending'  => 'was put back for review',
            );
            sg_flash('ok', '“' . sg_excerpt($row['name'], 40) . '” ' . $said[$want] . '.');
            sg_publish_after_save('testimonials');
        }
        sg_redirect($back);
    }

    /* ---------- delete ---------- */
    if ($do === 'delete') {
        $row = sg_one('SELECT * FROM sg_feedback WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            sg_run('DELETE FROM sg_feedback WHERE id = ?', array($row['id']));
            sg_flash('ok', 'Deleted the note from ' . $row['name'] . '.');
            if ($row['status'] === 'approved') sg_publish_after_save('testimonials');
        }
        sg_redirect($back);
    }

    /* ---------- order, within the approved list ---------- */
    if ($do === 'move') {
        $row = sg_one('SELECT * FROM sg_feedback WHERE id = ?', array(sg_post_int('id')));
        $dir = sg_post('dir') === 'up' ? 'up' : 'down';

        if ($row && $row['status'] === 'approved') {
            $all = sg_all("SELECT id FROM sg_feedback WHERE status = 'approved'
                           ORDER BY sort_order ASC, id ASC");
            $at = null;
            foreach ($all as $i => $r) if ((int) $r['id'] === (int) $row['id']) { $at = $i; break; }
            $to = $dir === 'up' ? $at - 1 : $at + 1;

            if ($at !== null && isset($all[$to])) {
                $order = $all;
                $moved = array_splice($order, $at, 1);
                array_splice($order, $to, 0, $moved);

                $st = sg_db()->prepare('UPDATE sg_feedback SET sort_order = ? WHERE id = ?');
                foreach ($order as $i => $r) $st->execute(array(($i + 1) * 10, $r['id']));

                sg_publish_after_save('testimonials');
            }
        }
        sg_redirect($back);
    }

    /* ---------- add by hand, or edit ---------- */
    if ($do === 'save') {
        $id  = sg_post_int('id');
        $row = $id ? sg_one('SELECT * FROM sg_feedback WHERE id = ?', array($id)) : null;

        $name     = sg_post('name');
        $role     = sg_post('designation');
        $type     = sg_post('feedback_type');
        $mobile   = sg_post('mobile');
        $note     = sg_post_text('note');
        $initials = mb_strtoupper(sg_post('initials'), 'UTF-8');
        $want     = sg_post('status');

        if (!in_array($want, $statuses, true)) $want = 'approved';
        if ($type === '') $type = 'Visitors';

        if ($name === '')            $errors[] = 'Please enter the name to show on the card.';
        if (mb_strlen($name) > 90)   $errors[] = 'That name is too long (90 characters maximum).';
        if ($note === '')            $errors[] = 'Please enter what they said.';
        if (mb_strlen($note) > 900)  $errors[] = 'The note is too long (900 characters maximum).';
        if ($initials !== '' && !preg_match('/^[\p{L}\p{N}]{1,4}$/u', $initials)) {
            $errors[] = 'The monogram may be up to four letters or numbers.';
        }

        if (!$errors) {
            if ($initials === '') $initials = sg_initials($name);
            $user = sg_user();
            $now  = date('Y-m-d H:i:s');

            if ($row) {
                $sort = (int) $row['sort_order'];
                if ($want === 'approved' && $row['status'] !== 'approved') {
                    $sort = (int) sg_val("SELECT MAX(sort_order) FROM sg_feedback WHERE status = 'approved'",
                        array(), 0) + 10;
                }
                sg_run('UPDATE sg_feedback SET feedback_type = ?, name = ?, designation = ?,
                        mobile = ?, note = ?, initials = ?, status = ?, sort_order = ?,
                        reviewed_at = ?, reviewed_by = ? WHERE id = ?',
                    array($type, $name, $role, $mobile, $note, $initials, $want, $sort,
                          $now, $user['username'], $row['id']));
                sg_flash('ok', 'Saved the note from ' . $name . '.');
            } else {
                $sort = (int) sg_val("SELECT MAX(sort_order) FROM sg_feedback WHERE status = 'approved'",
                    array(), 0) + 10;
                sg_run('INSERT INTO sg_feedback
                        (feedback_type, name, designation, mobile, note, initials, status, source,
                         sort_order, ip, submitted_at, reviewed_at, reviewed_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    array($type, $name, $role, $mobile, $note, $initials, $want, 'admin',
                          $sort, '', $now, $now, $user['username']));
                sg_flash('ok', 'Added the note from ' . $name
                    . ($want === 'approved' ? ' to the About page.' : '.'));
            }

            sg_publish_after_save('testimonials');
            sg_redirect('feedback.php?status=' . rawurlencode($want));
        }

        $action = $id ? 'edit' : 'new';
        $item = array('id' => $id, 'feedback_type' => $type, 'name' => $name,
                      'designation' => $role, 'mobile' => $mobile, 'note' => $note,
                      'initials' => $initials, 'status' => $want, 'source' => 'admin',
                      'submitted_at' => '', 'ip' => '', 'reviewed_by' => '');
    }
}

/* --------------------------------------------------------------------------
   Add / edit form
   -------------------------------------------------------------------------- */

if ($action === 'new' || $action === 'edit') {

    if (!isset($item)) {
        if ($action === 'edit') {
            $item = sg_one('SELECT * FROM sg_feedback WHERE id = ?', array($id));
            if (!$item) {
                sg_flash('error', 'That note no longer exists.');
                sg_redirect('feedback.php');
            }
        } else {
            $item = array('id' => 0, 'feedback_type' => 'Visitors', 'name' => '',
                          'designation' => '', 'mobile' => '', 'note' => '',
                          'initials' => '', 'status' => 'approved', 'source' => 'admin',
                          'submitted_at' => '', 'ip' => '', 'reviewed_by' => '');
        }
    }

    sg_admin_head($action === 'new' ? 'Add feedback' : 'Edit feedback', 'feedback.php');
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
            Editing it changes what the About page shows, not what was sent.
        </div>
    <?php endif; ?>

    <form method="post" action="feedback.php" class="card form">
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
                <span>Monogram <em>up to 4 letters — left empty it is taken from the name</em></span>
                <input type="text" name="initials" value="<?php echo e($item['initials']); ?>"
                       maxlength="4" style="text-transform:uppercase" spellcheck="false">
            </label>

            <label class="field field--wide">
                <span>What they said</span>
                <textarea name="note" rows="5" maxlength="900" required><?php echo e($item['note']); ?></textarea>
            </label>

            <label class="field">
                <span>Mobile <em>optional — kept for your records, never published</em></span>
                <input type="text" name="mobile" value="<?php echo e($item['mobile']); ?>" maxlength="24">
            </label>

            <label class="field">
                <span>Status</span>
                <select name="status">
                    <option value="approved" <?php echo $item['status'] === 'approved' ? 'selected' : ''; ?>>
                        Approved — shown on the About page</option>
                    <option value="pending" <?php echo $item['status'] === 'pending' ? 'selected' : ''; ?>>
                        Pending — waiting for review</option>
                    <option value="rejected" <?php echo $item['status'] === 'rejected' ? 'selected' : ''; ?>>
                        Rejected — kept but never published</option>
                </select>
            </label>

        </div>

        <div class="form__foot">
            <button type="submit" class="btn btn--primary">
                <?php echo $action === 'new' ? 'Add feedback' : 'Save changes'; ?>
            </button>
            <a class="btn btn--ghost" href="feedback.php?status=<?php echo e($status); ?>">Cancel</a>
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
    $counts[$s] = (int) sg_val('SELECT COUNT(*) FROM sg_feedback WHERE status = ?', array($s), 0);
}

$rows = $status === 'approved'
    ? sg_all('SELECT * FROM sg_feedback WHERE status = ? ORDER BY sort_order ASC, id ASC', array($status))
    : sg_all('SELECT * FROM sg_feedback WHERE status = ? ORDER BY id DESC', array($status));

$last  = count($rows) - 1;
$label = array('pending' => 'Awaiting review', 'approved' => 'On the About page', 'rejected' => 'Rejected');

sg_admin_head('Feedback', 'feedback.php');
?>

<div class="pagehead">
    <p>
        Approved notes become the cards in the
        <a href="../about_us.html#testimonials" target="_blank" rel="noopener">In Their Words</a>
        section of the About page, in this order. Nothing appears there until it is approved.
    </p>
    <a class="btn btn--primary" href="feedback.php?action=new">Add feedback</a>
</div>

<nav class="tabs" aria-label="Filter by status">
    <?php foreach ($statuses as $s): ?>
        <a href="feedback.php?status=<?php echo e($s); ?>"
           class="<?php echo $s === $status ? 'is-on' : ''; ?>"
           <?php echo $s === $status ? 'aria-current="page"' : ''; ?>>
            <?php echo e($label[$s]); ?>
            <b><?php echo (int) $counts[$s]; ?></b>
        </a>
    <?php endforeach; ?>
</nav>

<?php if (!$rows): ?>
    <div class="card empty-card">
        <h2>Nothing here</h2>
        <p>
            <?php if ($status === 'pending'): ?>
                Notes sent through the feedback form on the website arrive here first.
            <?php elseif ($status === 'approved'): ?>
                Approve a note, or add one by hand, and it appears on the About page.
            <?php else: ?>
                Rejected notes are kept here rather than deleted, so a decision can be reversed.
            <?php endif; ?>
        </p>
    </div>
<?php else: ?>
    <div class="notes">
        <?php foreach ($rows as $i => $r): ?>
            <article class="fb" id="f<?php echo (int) $r['id']; ?>">

                <header class="fb__head">
                    <span class="fb__av"><?php
                        echo e($r['initials'] !== '' ? $r['initials'] : sg_initials($r['name'], 2)); ?></span>

                    <span class="fb__who">
                        <strong><?php echo e($r['name']); ?></strong>
                        <em>
                            <?php echo e($r['feedback_type']); ?><?php
                                echo $r['designation'] !== '' ? ' · ' . e($r['designation']) : ''; ?>
                            <?php if ($r['submitted_at'] !== ''): ?>
                                · <?php echo e(sg_date($r['submitted_at'], 'd M Y')); ?>
                            <?php endif; ?>
                            <?php if ($r['source'] === 'website'): ?>
                                · <span class="tag">from the website form</span>
                            <?php endif; ?>
                        </em>
                    </span>

                    <?php if ($status === 'approved'): ?>
                        <span class="fb__ord">
                            <form method="post" action="feedback.php" class="inline">
                                <?php echo sg_csrf_field(); ?>
                                <input type="hidden" name="do" value="move">
                                <input type="hidden" name="dir" value="up">
                                <input type="hidden" name="back" value="<?php echo e($status); ?>">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="icon" aria-label="Move up"
                                    <?php echo $i === 0 ? 'disabled' : ''; ?>>&uarr;</button>
                            </form>
                            <form method="post" action="feedback.php" class="inline">
                                <?php echo sg_csrf_field(); ?>
                                <input type="hidden" name="do" value="move">
                                <input type="hidden" name="dir" value="down">
                                <input type="hidden" name="back" value="<?php echo e($status); ?>">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="icon" aria-label="Move down"
                                    <?php echo $i === $last ? 'disabled' : ''; ?>>&darr;</button>
                            </form>
                        </span>
                    <?php endif; ?>
                </header>

                <p class="fb__note"><?php echo nl2br(e($r['note'])); ?></p>

                <?php if ($r['mobile'] !== ''): ?>
                    <p class="fb__meta">Mobile <?php echo e($r['mobile']); ?><?php
                        echo $r['ip'] !== '' ? ' · sent from ' . e($r['ip']) : ''; ?></p>
                <?php endif; ?>

                <footer class="fb__bar">
                    <?php if ($status !== 'approved'): ?>
                        <form method="post" action="feedback.php" class="inline">
                            <?php echo sg_csrf_field(); ?>
                            <input type="hidden" name="do" value="status">
                            <input type="hidden" name="to" value="approved">
                            <input type="hidden" name="back" value="<?php echo e($status); ?>">
                            <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                            <button type="submit" class="btn btn--primary btn--sm">Approve &amp; publish</button>
                        </form>
                    <?php endif; ?>

                    <?php if ($status !== 'rejected'): ?>
                        <form method="post" action="feedback.php" class="inline">
                            <?php echo sg_csrf_field(); ?>
                            <input type="hidden" name="do" value="status">
                            <input type="hidden" name="to" value="rejected">
                            <input type="hidden" name="back" value="<?php echo e($status); ?>">
                            <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                            <button type="submit" class="btn btn--ghost btn--sm">
                                <?php echo $status === 'approved' ? 'Remove from the page' : 'Reject'; ?>
                            </button>
                        </form>
                    <?php endif; ?>

                    <?php if ($status !== 'pending'): ?>
                        <form method="post" action="feedback.php" class="inline">
                            <?php echo sg_csrf_field(); ?>
                            <input type="hidden" name="do" value="status">
                            <input type="hidden" name="to" value="pending">
                            <input type="hidden" name="back" value="<?php echo e($status); ?>">
                            <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                            <button type="submit" class="lnk">Back to review</button>
                        </form>
                    <?php endif; ?>

                    <a class="lnk" href="feedback.php?action=edit&amp;id=<?php echo (int) $r['id']; ?>">Edit</a>

                    <form method="post" action="feedback.php" class="inline"
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
