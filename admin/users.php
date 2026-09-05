<?php
/* ==========================================================================
   ADMIN — administrators
   ==========================================================================
   Owner-only. Create the people who may sign in, change their password, and
   take access away again.

   TWO ROLES, DELIBERATELY
     owner   everything, including this page
     editor  news, gallery and feedback — the daily work — but cannot create
             accounts or change anybody else's password

   THE LOCKOUT GUARD
   Every path that could leave the panel with no way in is refused: the last
   active owner cannot be deleted, deactivated or demoted, and nobody can
   delete or deactivate the account they are signed in as. Without those
   checks the first mis-click makes the panel unreachable, and the only repair
   is a database editor on the host.
   ========================================================================== */

require __DIR__ . '/_bootstrap.php';
sg_require_owner();
require __DIR__ . '/_layout.php';

$me     = sg_user();
$action = sg_get('action', 'list');
$id     = sg_get_int('id');
$errors = array();

function sg_active_owners($exceptId = 0) {
    return (int) sg_val("SELECT COUNT(*) FROM sg_users
                         WHERE role = 'owner' AND is_active = 1 AND id <> ?",
        array((int) $exceptId), 0);
}

/* --------------------------------------------------------------------------
   Writes
   -------------------------------------------------------------------------- */

if (sg_is_post()) {
    sg_csrf_check();
    $do = sg_post('do');

    /* ---------- delete ---------- */
    if ($do === 'delete') {
        $row = sg_one('SELECT * FROM sg_users WHERE id = ?', array(sg_post_int('id')));

        if (!$row) {
            sg_flash('error', 'That account no longer exists.');
        } elseif ((int) $row['id'] === (int) $me['id']) {
            sg_flash('error', 'You cannot delete the account you are signed in as.');
        } elseif ($row['role'] === 'owner' && sg_active_owners($row['id']) === 0) {
            sg_flash('error', 'That is the only owner account. Make somebody else an owner first.');
        } else {
            sg_run('DELETE FROM sg_users WHERE id = ?', array($row['id']));
            sg_flash('ok', 'Deleted the account “' . $row['username'] . '”.');
        }
        sg_redirect('users.php');
    }

    /* ---------- enable / disable ---------- */
    if ($do === 'toggle') {
        $row = sg_one('SELECT * FROM sg_users WHERE id = ?', array(sg_post_int('id')));
        $on  = $row ? ((int) $row['is_active'] === 1 ? 0 : 1) : 1;

        if (!$row) {
            sg_flash('error', 'That account no longer exists.');
        } elseif ((int) $row['id'] === (int) $me['id']) {
            sg_flash('error', 'You cannot disable the account you are signed in as.');
        } elseif ($on === 0 && $row['role'] === 'owner' && sg_active_owners($row['id']) === 0) {
            sg_flash('error', 'That is the only active owner. Make somebody else an owner first.');
        } else {
            sg_run('UPDATE sg_users SET is_active = ? WHERE id = ?', array($on, $row['id']));
            sg_flash('ok', '“' . $row['username'] . '” can ' . ($on ? 'sign in again' : 'no longer sign in') . '.');
        }
        sg_redirect('users.php');
    }

    /* ---------- create / update ---------- */
    if ($do === 'save') {
        $id  = sg_post_int('id');
        $row = $id ? sg_one('SELECT * FROM sg_users WHERE id = ?', array($id)) : null;

        if ($id && !$row) {
            sg_flash('error', 'That account no longer exists.');
            sg_redirect('users.php');
        }

        $username = sg_post('username');
        $fullName = sg_post('full_name');
        $email    = sg_post('email');
        $role     = sg_post('role') === 'owner' ? 'owner' : 'editor';
        $active   = sg_post_int('is_active') === 1 ? 1 : 0;
        $pass     = isset($_POST['password']) ? (string) $_POST['password'] : '';
        $confirm  = isset($_POST['password2']) ? (string) $_POST['password2'] : '';

        if ($fullName === '') $errors[] = 'Please enter a name.';
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'That email address does not look right.';
        }

        $u = sg_username_problem($username, $id);
        if ($u !== '') $errors[] = $u;

        /* on a new account a password is required; on an edit it is only set
           when something was typed */
        if (!$row || $pass !== '' || $confirm !== '') {
            $p = sg_password_problem($pass, $confirm);
            if ($p !== '') $errors[] = $p;
        }

        /* the same lockout guard, on the edit path */
        if ($row) {
            $losingOwner = ($row['role'] === 'owner' && ($role !== 'owner' || $active === 0));
            if ($losingOwner && sg_active_owners($row['id']) === 0) {
                $errors[] = 'That is the only active owner. Make somebody else an owner first.';
            }
            if ((int) $row['id'] === (int) $me['id']) {
                if ($active === 0) $errors[] = 'You cannot disable your own account.';
                if ($role !== 'owner') $errors[] = 'You cannot remove your own owner role.';
            }
        }

        if (!$errors) {
            if ($row) {
                sg_run('UPDATE sg_users SET username = ?, full_name = ?, email = ?,
                        role = ?, is_active = ? WHERE id = ?',
                    array($username, $fullName, $email, $role, $active, $row['id']));

                if ($pass !== '') {
                    sg_run('UPDATE sg_users SET password_hash = ? WHERE id = ?',
                        array(password_hash($pass, PASSWORD_DEFAULT), $row['id']));
                }
                sg_flash('ok', 'Saved the account “' . $username . '”.'
                    . ($pass !== '' ? ' The password was changed.' : ''));
            } else {
                sg_create_user($username, $pass, $fullName, $email, $role);
                if ($active === 0) {
                    sg_run('UPDATE sg_users SET is_active = 0 WHERE username = ?', array($username));
                }
                sg_flash('ok', 'Created the account “' . $username . '”. '
                    . 'Give them the password you just set — it cannot be read back.');
            }
            sg_redirect('users.php');
        }

        $action = $id ? 'edit' : 'new';
        $item = array('id' => $id, 'username' => $username, 'full_name' => $fullName,
                      'email' => $email, 'role' => $role, 'is_active' => $active,
                      'last_login_at' => $row ? $row['last_login_at'] : '',
                      'created_at' => $row ? $row['created_at'] : '');
    }
}

/* --------------------------------------------------------------------------
   Add / edit form
   -------------------------------------------------------------------------- */

if ($action === 'new' || $action === 'edit') {

    if (!isset($item)) {
        if ($action === 'edit') {
            $item = sg_one('SELECT * FROM sg_users WHERE id = ?', array($id));
            if (!$item) {
                sg_flash('error', 'That account no longer exists.');
                sg_redirect('users.php');
            }
        } else {
            $item = array('id' => 0, 'username' => '', 'full_name' => '', 'email' => '',
                          'role' => 'editor', 'is_active' => 1, 'last_login_at' => '',
                          'created_at' => '');
        }
    }

    $isSelf = (int) $item['id'] === (int) $me['id'];

    sg_admin_head($action === 'new' ? 'Add an administrator' : 'Edit administrator', 'users.php');
    ?>

    <?php if ($errors): ?>
        <div class="note note--error" role="alert">
            <?php foreach ($errors as $i => $err): ?>
                <?php echo $i ? '<br>' : ''; ?><?php echo e($err); ?>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <form method="post" action="users.php" class="card form" autocomplete="off">
        <?php echo sg_csrf_field(); ?>
        <input type="hidden" name="do" value="save">
        <input type="hidden" name="id" value="<?php echo (int) $item['id']; ?>">

        <div class="form__grid">

            <label class="field">
                <span>Name</span>
                <input type="text" name="full_name" value="<?php echo e($item['full_name']); ?>"
                       maxlength="80" required autofocus>
            </label>

            <label class="field">
                <span>Email <em>optional</em></span>
                <input type="email" name="email" value="<?php echo e($item['email']); ?>" maxlength="120">
            </label>

            <label class="field">
                <span>Username <em>what they type to sign in</em></span>
                <input type="text" name="username" value="<?php echo e($item['username']); ?>"
                       maxlength="40" required spellcheck="false" autocomplete="off">
            </label>

            <label class="field">
                <span>Role</span>
                <select name="role" <?php echo $isSelf ? 'disabled' : ''; ?>>
                    <option value="editor" <?php echo $item['role'] === 'editor' ? 'selected' : ''; ?>>
                        Editor — news, gallery and feedback</option>
                    <option value="owner" <?php echo $item['role'] === 'owner' ? 'selected' : ''; ?>>
                        Owner — everything, including these accounts</option>
                </select>
                <?php if ($isSelf): ?>
                    <input type="hidden" name="role" value="owner">
                    <small class="hint">You cannot change your own role.</small>
                <?php endif; ?>
            </label>

            <label class="field">
                <span><?php echo $action === 'new' ? 'Password' : 'New password'; ?>
                    <?php if ($action === 'edit'): ?><em>leave empty to keep the current one</em><?php endif; ?></span>
                <input type="password" name="password" autocomplete="new-password"
                       <?php echo $action === 'new' ? 'required' : ''; ?>>
            </label>

            <label class="field">
                <span>Repeat password</span>
                <input type="password" name="password2" autocomplete="new-password"
                       <?php echo $action === 'new' ? 'required' : ''; ?>>
            </label>

            <label class="check check--box field--wide">
                <input type="checkbox" name="is_active" value="1"
                       <?php echo (int) $item['is_active'] === 1 ? 'checked' : ''; ?>
                       <?php echo $isSelf ? 'disabled' : ''; ?>>
                <span>Allowed to sign in<em>Unticked, the account is kept but refused at the sign-in screen.</em></span>
            </label>
            <?php if ($isSelf): ?><input type="hidden" name="is_active" value="1"><?php endif; ?>

        </div>

        <?php if ($action === 'edit' && $item['last_login_at'] !== ''): ?>
            <p class="card__note">Last signed in <?php echo e(sg_date($item['last_login_at'], 'd M Y, g:i a')); ?>.</p>
        <?php endif; ?>

        <div class="form__foot">
            <button type="submit" class="btn btn--primary">
                <?php echo $action === 'new' ? 'Create account' : 'Save changes'; ?>
            </button>
            <a class="btn btn--ghost" href="users.php">Cancel</a>
        </div>
    </form>

    <?php
    sg_admin_foot();
    exit;
}

/* --------------------------------------------------------------------------
   The list
   -------------------------------------------------------------------------- */

$rows = sg_all('SELECT * FROM sg_users ORDER BY role ASC, username ASC');

sg_admin_head('Administrators', 'users.php');
?>

<div class="pagehead">
    <p>
        Who may sign in to this panel. Passwords are stored only as a one-way hash —
        a forgotten one is reset here, never read back.
    </p>
    <a class="btn btn--primary" href="users.php?action=new">Add an administrator</a>
</div>

<div class="card">
    <table class="tbl tbl--rows">
        <thead>
            <tr>
                <th>Person</th>
                <th class="w-role">Role</th>
                <th class="w-date">Last signed in</th>
                <th class="w-state">Access</th>
                <th class="w-act2"></th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($rows as $r): $isSelf = (int) $r['id'] === (int) $me['id']; ?>
                <tr>
                    <td>
                        <strong><?php echo e($r['full_name'] !== '' ? $r['full_name'] : $r['username']); ?>
                            <?php if ($isSelf): ?><span class="tag">you</span><?php endif; ?></strong>
                        <span class="muted"><?php echo e($r['username']); ?><?php
                            echo $r['email'] !== '' ? ' · ' . e($r['email']) : ''; ?></span>
                    </td>
                    <td class="w-role"><?php echo $r['role'] === 'owner' ? 'Owner' : 'Editor'; ?></td>
                    <td class="muted w-date"><?php
                        echo $r['last_login_at'] !== '' ? e(sg_date($r['last_login_at'], 'd M Y')) : 'never'; ?></td>
                    <td>
                        <?php if ($isSelf): ?>
                            <span class="chip chip--on">Active</span>
                        <?php else: ?>
                            <form method="post" action="users.php">
                                <?php echo sg_csrf_field(); ?>
                                <input type="hidden" name="do" value="toggle">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="chip chip--<?php echo $r['is_active'] ? 'on' : 'off'; ?> chip--btn"
                                        title="<?php echo $r['is_active'] ? 'Stop this account signing in' : 'Let this account sign in again'; ?>">
                                    <?php echo $r['is_active'] ? 'Active' : 'Disabled'; ?>
                                </button>
                            </form>
                        <?php endif; ?>
                    </td>
                    <td class="nowrap">
                        <a class="lnk" href="users.php?action=edit&amp;id=<?php echo (int) $r['id']; ?>">Edit</a>
                        <?php if (!$isSelf): ?>
                            <form method="post" action="users.php" class="inline"
                                  data-confirm="Delete the account “<?php echo e($r['username']); ?>”? This cannot be undone.">
                                <?php echo sg_csrf_field(); ?>
                                <input type="hidden" name="do" value="delete">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="lnk lnk--danger">Delete</button>
                            </form>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<?php sg_admin_foot(); ?>
