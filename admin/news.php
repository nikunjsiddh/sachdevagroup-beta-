<?php
/* ==========================================================================
   ADMIN — news
   ==========================================================================
   List, create, edit, reorder and delete the articles on news.html.

   Every write ends in a redirect (POST/Redirect/GET), so a refresh after
   saving re-shows the list instead of saving a second copy, and every write
   is followed by sg_publish_after_save() — the page on the website is rebuilt
   as part of saving rather than needing a separate "publish" step somebody
   can forget.
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
        $row = sg_one('SELECT * FROM sg_news WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            sg_run('DELETE FROM sg_news WHERE id = ?', array($row['id']));
            sg_delete_upload($row['image']);
            sg_flash('ok', 'Deleted “' . $row['title'] . '”.');
            sg_publish_after_save('news');
        }
        sg_redirect('news.php');
    }

    /* ---------- live / draft ---------- */
    if ($do === 'toggle') {
        $row = sg_one('SELECT * FROM sg_news WHERE id = ?', array(sg_post_int('id')));
        if ($row) {
            $now = (int) $row['is_published'] === 1 ? 0 : 1;
            sg_run('UPDATE sg_news SET is_published = ?, updated_at = ? WHERE id = ?',
                array($now, date('Y-m-d H:i:s'), $row['id']));
            sg_flash('ok', '“' . $row['title'] . '” is now ' . ($now ? 'live on the website' : 'a draft') . '.');
            sg_publish_after_save('news');
        }
        sg_redirect('news.php');
    }

    /* ---------- order ----------
       Swapping sort_order with the neighbour in the current sort is what
       makes "up" mean up even when two rows share a number. */
    if ($do === 'move') {
        $row = sg_one('SELECT * FROM sg_news WHERE id = ?', array(sg_post_int('id')));
        $dir = sg_post('dir') === 'up' ? 'up' : 'down';

        if ($row) {
            $all = sg_all('SELECT id, sort_order FROM sg_news
                           ORDER BY sort_order ASC, published_on DESC, id DESC');
            $at = null;
            foreach ($all as $i => $r) if ((int) $r['id'] === (int) $row['id']) { $at = $i; break; }
            $to = $dir === 'up' ? $at - 1 : $at + 1;

            if ($at !== null && isset($all[$to])) {
                /* Rewrite the whole column rather than swapping two values:
                   rows seeded or imported with equal sort_order cannot be
                   reordered by swapping, because the swap is a no-op. */
                $order = $all;
                $moved = array_splice($order, $at, 1);
                array_splice($order, $to, 0, $moved);

                $st = sg_db()->prepare('UPDATE sg_news SET sort_order = ? WHERE id = ?');
                foreach ($order as $i => $r) $st->execute(array(($i + 1) * 10, $r['id']));

                sg_publish_after_save('news');
            }
        }
        sg_redirect('news.php');
    }

    /* ---------- create / update ---------- */
    if ($do === 'save') {
        $id      = sg_post_int('id');
        $row     = $id ? sg_one('SELECT * FROM sg_news WHERE id = ?', array($id)) : null;

        $title   = sg_post('title');
        $cat     = sg_post('category');
        $date    = sg_post('published_on');
        $summary = sg_post_text('summary');
        $body    = sg_post_text('body');
        $link    = sg_post('link_url');
        $live    = sg_post_int('is_published') === 1 ? 1 : 0;
        $image   = $row ? $row['image'] : '';

        if ($title === '')             $errors[] = 'Please give the article a title.';
        if (mb_strlen($title) > 160)   $errors[] = 'The title is too long (160 characters maximum).';
        if ($summary === '')           $errors[] = 'Please write the short text that appears on the card.';
        if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $errors[] = 'The date must be a real date.';
        }
        if ($link !== '' && sg_link_href($link) === '') {
            $errors[] = 'The link must start with http:// or https://, or be a page on this site.';
        }
        if ($cat === '') $cat = 'Announcement';
        if ($date === '') $date = date('Y-m-d');

        /* a new picture replaces the old one, and the old file goes with it */
        $upErr = '';
        $newImage = sg_upload_image('image', 'news', $upErr);
        if ($newImage !== '') {
            $image = $newImage;
        } elseif ($upErr !== '' && $upErr !== 'no-file') {
            $errors[] = $upErr;
        }

        if (sg_post_int('remove_image') === 1 && $newImage === '') {
            $image = '';
        }

        if (!$errors) {
            $now = date('Y-m-d H:i:s');

            if ($row) {
                sg_run('UPDATE sg_news SET title = ?, category = ?, summary = ?, body = ?,
                        image = ?, link_url = ?, published_on = ?, is_published = ?, updated_at = ?
                        WHERE id = ?',
                    array($title, $cat, $summary, $body, $image, $link, $date, $live, $now, $row['id']));

                if ($row['image'] !== '' && $row['image'] !== $image) {
                    sg_delete_upload($row['image']);
                }
                sg_flash('ok', 'Saved “' . $title . '”.');
            } else {
                $next = (int) sg_val('SELECT MAX(sort_order) FROM sg_news', array(), 0) + 10;
                sg_run('INSERT INTO sg_news
                        (title, category, summary, body, image, link_url, published_on,
                         is_published, sort_order, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    array($title, $cat, $summary, $body, $image, $link, $date,
                          $live, $next, $now, $now));
                sg_flash('ok', 'Added “' . $title . '”'
                    . ($live ? ' and published it to the news page.' : ' as a draft.'));
            }

            sg_publish_after_save('news');
            sg_redirect('news.php');
        }

        /* validation failed — fall through and re-show the form as typed */
        $action = $id ? 'edit' : 'new';
        $item = array(
            'id' => $id, 'title' => $title, 'category' => $cat, 'summary' => $summary,
            'body' => $body, 'image' => $image, 'link_url' => $link,
            'published_on' => $date, 'is_published' => $live,
        );
    }
}

/* --------------------------------------------------------------------------
   The form
   -------------------------------------------------------------------------- */

if (!isset($item)) {
    if ($action === 'edit') {
        $item = sg_one('SELECT * FROM sg_news WHERE id = ?', array($id));
        if (!$item) {
            sg_flash('error', 'That article no longer exists.');
            sg_redirect('news.php');
        }
    } elseif ($action === 'new') {
        $item = array(
            'id' => 0, 'title' => '', 'category' => 'Announcement', 'summary' => '',
            'body' => '', 'image' => '', 'link_url' => '',
            'published_on' => date('Y-m-d'), 'is_published' => 1,
        );
    }
}

if ($action === 'new' || $action === 'edit') {

    sg_admin_head($action === 'new' ? 'Add a news article' : 'Edit news article', 'news.php');
    $maxUp = sg_effective_max_upload();
    ?>

    <?php if ($errors): ?>
        <div class="note note--error" role="alert">
            <?php foreach ($errors as $i => $err): ?>
                <?php echo $i ? '<br>' : ''; ?><?php echo e($err); ?>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <form method="post" action="news.php" enctype="multipart/form-data" class="card form">
        <?php echo sg_csrf_field(); ?>
        <input type="hidden" name="do" value="save">
        <input type="hidden" name="id" value="<?php echo (int) $item['id']; ?>">

        <div class="form__grid">

            <label class="field field--wide">
                <span>Title</span>
                <input type="text" name="title" value="<?php echo e($item['title']); ?>"
                       maxlength="160" required autofocus>
            </label>

            <label class="field">
                <span>Category <em>shown above the title</em></span>
                <input type="text" name="category" value="<?php echo e($item['category']); ?>"
                       maxlength="60" list="sg-cats">
                <datalist id="sg-cats">
                    <option value="Announcement"></option>
                    <option value="Press Release"></option>
                    <option value="Certification"></option>
                    <option value="Notice"></option>
                    <option value="Event"></option>
                </datalist>
            </label>

            <label class="field">
                <span>Date</span>
                <input type="date" name="published_on" value="<?php echo e($item['published_on']); ?>">
            </label>

            <label class="field field--wide">
                <span>Card text <em>the paragraph readers see on the news page</em></span>
                <textarea name="summary" rows="4" maxlength="900" required><?php echo e($item['summary']); ?></textarea>
            </label>

            <label class="field field--wide">
                <span>Further detail <em>optional — extra paragraphs under the card text</em></span>
                <textarea name="body" rows="6" maxlength="4000"><?php echo e($item['body']); ?></textarea>
            </label>

            <label class="field field--wide">
                <span>Link <em>optional — adds a &ldquo;Read more&rdquo; button</em></span>
                <input type="text" name="link_url" value="<?php echo e($item['link_url']); ?>"
                       maxlength="400" placeholder="https://…  or  contact_us.html">
            </label>

            <div class="field field--wide">
                <span>Picture <em>optional</em></span>

                <?php if ($item['image'] !== ''): ?>
                    <div class="thumbrow">
                        <img class="thumb" src="../<?php echo e($item['image']); ?>" alt="">
                        <label class="check">
                            <input type="checkbox" name="remove_image" value="1">
                            <span>Remove this picture</span>
                        </label>
                    </div>
                <?php endif; ?>

                <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif">
                <small class="hint">
                    JPG, PNG, WebP or GIF, up to <?php echo e(sg_bytes($maxUp)); ?>.
                    A landscape picture around 1200&times;750 fits the card best.
                    <?php if ($item['image'] !== ''): ?>Choosing a new file replaces the one above.<?php endif; ?>
                </small>
            </div>

            <label class="check check--box field--wide">
                <input type="checkbox" name="is_published" value="1"
                       <?php echo (int) $item['is_published'] === 1 ? 'checked' : ''; ?>>
                <span>Live on the website<em>Unticked, it is kept here as a draft and does not appear on news.html.</em></span>
            </label>

        </div>

        <div class="form__foot">
            <button type="submit" class="btn btn--primary">
                <?php echo $action === 'new' ? 'Add article' : 'Save changes'; ?>
            </button>
            <a class="btn btn--ghost" href="news.php">Cancel</a>
        </div>
    </form>

    <?php
    sg_admin_foot();
    exit;
}

/* --------------------------------------------------------------------------
   The list
   -------------------------------------------------------------------------- */

$rows = sg_all('SELECT * FROM sg_news ORDER BY sort_order ASC, published_on DESC, id DESC');
$last = count($rows) - 1;

sg_admin_head('News', 'news.php');
?>

<div class="pagehead">
    <p>
        These become the cards on <a href="../news.html" target="_blank" rel="noopener">news.html</a>.
        With none of them live, that page keeps its &ldquo;nothing published yet&rdquo; note.
    </p>
    <a class="btn btn--primary" href="news.php?action=new">Add an article</a>
</div>

<?php if (!$rows): ?>
    <div class="card empty-card">
        <h2>No articles yet</h2>
        <p>Add the first one and the news page rebuilds itself around it.</p>
        <a class="btn btn--primary" href="news.php?action=new">Add an article</a>
    </div>
<?php else: ?>
    <div class="card">
        <table class="tbl tbl--rows">
            <thead>
                <tr>
                    <th class="w-pic">Picture</th>
                    <th>Article</th>
                    <th class="w-date">Date</th>
                    <th class="w-state">State</th>
                    <th class="w-act">Order</th>
                    <th class="w-act2"></th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($rows as $i => $r): ?>
                    <tr>
                        <td class="w-pic">
                            <?php if ($r['image'] !== ''): ?>
                                <img class="thumb thumb--sm" src="../<?php echo e($r['image']); ?>" alt="">
                            <?php else: ?>
                                <span class="thumb thumb--sm thumb--none" aria-hidden="true"></span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <strong><?php echo e($r['title']); ?></strong>
                            <span class="muted"><?php echo e($r['category']); ?> ·
                                <?php echo e(sg_excerpt($r['summary'], 90)); ?></span>
                        </td>
                        <td class="muted w-date"><?php echo e(sg_date($r['published_on'])); ?></td>
                        <td>
                            <form method="post" action="news.php">
                                <?php echo sg_csrf_field(); ?>
                                <input type="hidden" name="do" value="toggle">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="chip chip--<?php echo $r['is_published'] ? 'on' : 'off'; ?> chip--btn"
                                        title="<?php echo $r['is_published'] ? 'Make this a draft' : 'Publish this'; ?>">
                                    <?php echo $r['is_published'] ? 'Live' : 'Draft'; ?>
                                </button>
                            </form>
                        </td>
                        <td class="nowrap">
                            <form method="post" action="news.php" class="inline">
                                <?php echo sg_csrf_field(); ?>
                                <input type="hidden" name="do" value="move">
                                <input type="hidden" name="dir" value="up">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="icon" aria-label="Move up"
                                    <?php echo $i === 0 ? 'disabled' : ''; ?>>&uarr;</button>
                            </form>
                            <form method="post" action="news.php" class="inline">
                                <?php echo sg_csrf_field(); ?>
                                <input type="hidden" name="do" value="move">
                                <input type="hidden" name="dir" value="down">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="icon" aria-label="Move down"
                                    <?php echo $i === $last ? 'disabled' : ''; ?>>&darr;</button>
                            </form>
                        </td>
                        <td class="nowrap">
                            <a class="lnk" href="news.php?action=edit&amp;id=<?php echo (int) $r['id']; ?>">Edit</a>
                            <form method="post" action="news.php" class="inline"
                                  data-confirm="Delete “<?php echo e($r['title']); ?>”? This cannot be undone.">
                                <?php echo sg_csrf_field(); ?>
                                <input type="hidden" name="do" value="delete">
                                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                                <button type="submit" class="lnk lnk--danger">Delete</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
<?php endif; ?>

<?php sg_admin_foot(); ?>
