<?php
/* ==========================================================================
   PUBLISHER
   ==========================================================================
   Turns rows in the database into the markup that news.html, gallery.html and
   about_us.html actually serve, and writes it into those files between a pair
   of marker comments.

   WHY IT WRITES HTML INSTEAD OF SERVING JSON
   The obvious build for a panel like this is a JSON endpoint plus fetch() on
   the page. It was not used, for one specific reason: on this site the markup
   is not the whole story. Every section is wired to four separate engines —
   js/marine.js observes [data-mrn-reveal] and [data-mrn-stagger],
   js/marine-pages.js binds [data-mrnp-tilt] and builds the gallery lightbox
   from the tiles it can see, js/page-fx.js re-claims some of those attributes
   from the others, and js/scroll-drift.js scrubs [data-drift-img]. All four
   read the DOM once, at DOMContentLoaded, and none of them re-scan. Content
   injected after a fetch resolves has therefore missed every one of them: the
   gallery would render and then not open, and the cards would sit at the
   opacity their entrance animation starts from.

   Publishing real markup into the file sidesteps all of it. The content is in
   the DOM before any script runs, so it animates and behaves exactly like the
   markup that was typed by hand — nothing in js/ or css/ has to change, and
   nothing has to be kept in sync with it. The page also stays indexable and
   keeps working with JavaScript off, which a fetch-rendered newsroom does not.

   THE COST, STATED PLAINLY
   The panel needs write permission on those three .html files. If it does not
   have it, publish() says so by name and changes nothing.

   ANYTHING BETWEEN THE MARKERS IS DISPOSABLE
   The region is replaced wholesale on every publish. Everything outside the
   markers — the section heading, the layout, the address band — is never
   touched, so the page can still be edited by hand everywhere else.
   ========================================================================== */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

/* --------------------------------------------------------------------------
   Reading what should be on the pages
   -------------------------------------------------------------------------- */

function sg_published_news() {
    return sg_all('SELECT * FROM sg_news WHERE is_published = 1
                   ORDER BY sort_order ASC, published_on DESC, id DESC');
}

function sg_published_gallery() {
    return sg_all('SELECT * FROM sg_gallery WHERE is_published = 1
                   ORDER BY sort_order ASC, id ASC');
}

function sg_published_feedback() {
    return sg_all("SELECT * FROM sg_feedback WHERE status = 'approved'
                   ORDER BY sort_order ASC, id ASC");
}

/* --------------------------------------------------------------------------
   Small rendering helpers
   -------------------------------------------------------------------------- */

/* Indent a rendered block so the file it lands in stays readable. */
function sg_indent($html, $spaces) {
    $pad   = str_repeat(' ', $spaces);
    $lines = explode("\n", rtrim($html, "\n"));
    foreach ($lines as $i => $l) {
        $lines[$i] = ($l === '') ? '' : $pad . $l;
    }
    return implode("\n", $lines);
}

/* Free text typed in the panel, as paragraphs. Escaped first, so a stray
   < in someone's note is a less-than sign and not the start of a tag; blank
   lines become paragraph breaks and single newlines become <br>. */
function sg_paragraphs($text, $class = '') {
    $text = trim((string) $text);
    if ($text === '') return '';

    $cls   = $class !== '' ? ' class="' . e($class) . '"' : '';
    $out   = '';
    $blocks = preg_split('/\n\s*\n/u', $text);

    foreach ($blocks as $b) {
        $b = trim($b);
        if ($b === '') continue;
        $out .= '<p' . $cls . '>' . nl2br(e($b)) . '</p>' . "\n";
    }
    return $out;
}

/* An image path that is safe to drop into src="". Anything absolute, any
   scheme, and any .. segment is refused — an image column is written by an
   administrator, but "trusted" is not the same as "unchecked", and a
   javascript: here would be an XSS on every visitor to the page. */
function sg_img_src($path) {
    $path = trim((string) $path);
    if ($path === '') return '';
    if (preg_match('#^[a-z][a-z0-9+.\-]*:#i', $path)) return '';   /* no scheme */
    if (strpos($path, '//') === 0) return '';                      /* no //host */
    if (strpos($path, '..') !== false) return '';
    return ltrim($path, '/');
}

/* Links may be external, so http(s) is allowed here — but only that. */
function sg_link_href($url) {
    $url = trim((string) $url);
    if ($url === '') return '';
    if (preg_match('#^(https?://|/|[\w.\-]+\.html)#i', $url)) return $url;
    return '';
}

/* --------------------------------------------------------------------------
   BLOCK 1 — news.html
   --------------------------------------------------------------------------
   Two renderings. With nothing published the page keeps the split layout and
   the "nothing published yet" note it has today, because a newsroom heading
   over an empty grid reads as broken. As soon as one article exists the
   section becomes a centred heading over the .mrnp-post card grid that
   css/marine-pages.css section 9 already styles.
   -------------------------------------------------------------------------- */

function sg_render_news($rows) {

    if (!$rows) {
        return <<<HTML
<div class="mrnp-split mrnp-split--wide-left">
    <div class="mrnp-split__media" data-mrn-tilt="8" data-mrn-reveal="left">
        <div class="mrnp-split__frame" data-drift-img data-sfx-open>
            <img loading="lazy" decoding="async" src="images/ship_recycling.jpg"
                alt="Aerial view of the Sachdeva Group ship recycling yard at Alang">
        </div>
        <span class="mrnp-split__tag">Ship Recycling</span>
    </div>

    <div>
        <span class="mrn-eyebrow" data-sg-in="up">News &amp; Media</span>
        <h2 class="mrn-title" data-sg-split>Latest <em>News</em></h2>

        <div class="pfx-note pfx-note--live" data-mrnp-tilt="4">
            <span class="pfx-note__flag">
                <i aria-hidden="true"></i> Newsroom &middot; nothing published yet
            </span>
            <p>
                No articles have been published on this page yet. Sachdeva Group announcements,
                notices and media material will appear here as they are released.
            </p>
            <p>
                For press or media enquiries in the meantime, please get in touch with us directly.
            </p>
        </div>

        <a href="contact_us.html" class="mrn-btn mrn-btn--navy" data-mrn-magnetic>
            Contact Us
            <svg class="sg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M2.5 12h17" />
                <path d="m13.2 5.7 6.3 6.3-6.3 6.3" />
            </svg>
        </a>
    </div>
</div>
HTML;
    }

    $out = '<div class="mrn-center">' . "\n"
         . '    <span class="mrn-eyebrow" data-sg-in="up">News &amp; Media</span>' . "\n"
         . '    <h2 class="mrn-title" data-sg-split>Latest <em>News</em></h2>' . "\n"
         . '    <p class="mrn-lead" data-mrn-reveal>' . "\n"
         . '        Announcements, notices and media material released by Sachdeva Group of Industries.' . "\n"
         . '    </p>' . "\n"
         . '</div>' . "\n\n"
         . '<div class="mrnp-news" data-mrn-stagger="90" data-mrn-reveal>' . "\n";

    foreach ($rows as $r) {
        $img   = sg_img_src($r['image']);
        $href  = sg_link_href($r['link_url']);
        $date  = sg_date($r['published_on']);
        $title = e($r['title']);

        $out .= '    <article class="mrnp-post" data-mrnp-tilt="6">' . "\n";

        if ($img !== '') {
            $out .= '        <div class="mrnp-post__pic" data-drift-img data-sfx-open>' . "\n"
                  . '            <img loading="lazy" decoding="async" src="' . e($img) . '"'
                  . ' alt="' . $title . '">' . "\n";
            if ($date !== '') {
                $out .= '            <span class="mrnp-post__date">' . e($date) . '</span>' . "\n";
            }
            $out .= '        </div>' . "\n";
        }

        $out .= '        <div class="mrnp-post__body">' . "\n";

        /* With no picture there is nowhere for the date badge to sit, so the
           category and the date run as a line of type above the heading. */
        if ($img === '') {
            $meta = array_filter(array(trim((string) $r['category']), $date));
            if ($meta) {
                $out .= '            <span class="mrn-eyebrow">'
                      . e(implode(' · ', $meta)) . '</span>' . "\n";
            }
        } elseif (trim((string) $r['category']) !== '') {
            $out .= '            <span class="mrn-eyebrow">' . e($r['category']) . '</span>' . "\n";
        }

        $out .= '            <h4>' . $title . '</h4>' . "\n";
        $out .= sg_indent(sg_paragraphs($r['summary']), 12) . "\n";

        $detail = sg_paragraphs($r['body']);
        if ($detail !== '') $out .= sg_indent($detail, 12) . "\n";

        if ($href !== '') {
            $external = stripos($href, 'http') === 0;
            $out .= '            <a class="mrnp-post__more" href="' . e($href) . '"'
                  . ($external ? ' target="_blank" rel="noopener noreferrer"' : '') . '>' . "\n"
                  . '                Read more' . "\n"
                  . '                <svg class="sg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                  . ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
                  . ' focusable="false">' . "\n"
                  . '                    <path d="M2.5 12h17" />' . "\n"
                  . '                    <path d="m13.2 5.7 6.3 6.3-6.3 6.3" />' . "\n"
                  . '                </svg>' . "\n"
                  . '            </a>' . "\n";
        }

        $out .= '        </div>' . "\n"
              . '    </article>' . "\n";
    }

    $out .= '</div>';
    return $out;
}

/* --------------------------------------------------------------------------
   BLOCK 2 — gallery.html
   --------------------------------------------------------------------------
   The tiles js/marine-pages.js turns into the lightbox. Every attribute here
   is load-bearing: [data-mrnp-lightbox] is what the viewer collects, and the
   caption it shows comes from [data-mrnp-caption].
   -------------------------------------------------------------------------- */

function sg_render_gallery($rows) {

    if (!$rows) {
        return '<div class="pfx-note pfx-note--live" data-mrnp-tilt="4">' . "\n"
             . '    <span class="pfx-note__flag">' . "\n"
             . '        <i aria-hidden="true"></i> Gallery &middot; nothing published yet' . "\n"
             . '    </span>' . "\n"
             . '    <p>Photographs of the yard will appear here as they are released.</p>' . "\n"
             . '</div>';
    }

    $zoom = '        <span class="mrnp-gal__zoom">' . "\n"
          . '            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"'
          . ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . "\n"
          . '                <circle cx="11" cy="11" r="7"></circle>' . "\n"
          . '                <line x1="20" y1="20" x2="16.65" y2="16.65"></line>' . "\n"
          . '                <line x1="11" y1="8" x2="11" y2="14"></line>' . "\n"
          . '                <line x1="8" y1="11" x2="14" y2="11"></line>' . "\n"
          . '            </svg>' . "\n"
          . '        </span>' . "\n";

    $out = '<div class="mrnp-gal" data-mrn-stagger="80" data-mrn-reveal>' . "\n";

    foreach ($rows as $r) {
        $img = sg_img_src($r['image']);
        if ($img === '') continue;

        $title = e($r['title']);
        $cap   = trim((string) $r['caption']);
        $cap   = $cap !== '' ? e($cap) : $title;

        $out .= '    <a class="mrnp-gal__item" data-mrnp-tilt="6" data-mrnp-lightbox="' . e($img) . '"' . "\n"
              . '        data-mrnp-caption="' . $cap . '" data-drift-img data-sfx-open>' . "\n"
              . '        <img loading="lazy" decoding="async" src="' . e($img) . '" alt="' . $title . '">' . "\n"
              . $zoom
              . '        <span class="mrnp-gal__cap">' . $title . '</span>' . "\n"
              . '    </a>' . "\n\n";
    }

    return rtrim($out) . "\n" . '</div>';
}

/* --------------------------------------------------------------------------
   BLOCK 3 — the feedback section of about_us.html
   --------------------------------------------------------------------------
   css/about-fx.css scopes every one of these rules to #testimonials, so the
   cards only look right inside that section. The numbering in the corner is
   positional and regenerated on each publish — deleting card 2 renumbers the
   rest rather than leaving a gap.
   -------------------------------------------------------------------------- */

function sg_render_testimonials($rows) {

    if (!$rows) {
        return '<div class="pfx-note pfx-note--live" data-mrnp-tilt="4">' . "\n"
             . '    <span class="pfx-note__flag">' . "\n"
             . '        <i aria-hidden="true"></i> Feedback &middot; nothing published yet' . "\n"
             . '    </span>' . "\n"
             . '    <p>Comments recorded by visitors to the yard will appear here once approved.</p>' . "\n"
             . '</div>';
    }

    $out = '<div class="tst-grid" data-mrn-stagger="130" data-mrn-reveal>' . "\n";
    $n   = 0;

    foreach ($rows as $r) {
        $n++;
        $mono = trim((string) $r['initials']);
        if ($mono === '') $mono = sg_initials($r['name']);

        /* designation is shown only when there is one — an empty line under a
           name leaves the card looking like it failed to load */
        $who = trim((string) $r['name']);
        $role = trim((string) $r['designation']);

        $out .= '    <article class="tst" data-mrnp-tilt="6">' . "\n"
              . '        <div class="tst__head">' . "\n"
              . '            <span class="tst__mono" aria-hidden="true">' . e($mono) . '</span>' . "\n"
              . '            <strong class="tst__who">' . e($who)
              . ($role !== '' ? ' <span class="tst__role">&middot; ' . e($role) . '</span>' : '')
              . '</strong>' . "\n"
              . '            <span class="tst__no" aria-hidden="true">'
              . e(str_pad((string) $n, 2, '0', STR_PAD_LEFT)) . '</span>' . "\n"
              . '        </div>' . "\n"
              . '        <span class="tst__rule" aria-hidden="true"></span>' . "\n"
              . '        <p class="tst__text">' . nl2br(e(trim((string) $r['note']))) . '</p>' . "\n"
              . '    </article>' . "\n\n";
    }

    return rtrim($out) . "\n" . '</div>';
}

/* --------------------------------------------------------------------------
   Writing it into the page
   -------------------------------------------------------------------------- */

function sg_marker_start($block) { return 'SG-CMS:' . $block . ':start'; }
function sg_marker_end($block)   { return 'SG-CMS:' . $block . ':end'; }

/* Publish one block. Returns array(ok, message). */
function sg_publish_block($block) {
    $targets = (array) sg_config('targets', array());

    if (!isset($targets[$block])) {
        return array(false, 'No page is configured for "' . $block . '".');
    }

    $file = sg_root() . '/' . $targets[$block];
    $name = $targets[$block];

    if (!is_file($file)) {
        return array(false, $name . ' was not found in the site folder.');
    }

    $html = @file_get_contents($file);
    if ($html === false) {
        return array(false, 'Could not read ' . $name . '.');
    }

    /* The markers. Anything the author wrote after the block name inside the
       start comment is kept, so the "managed by /admin" note that tells the
       next person not to edit here survives every publish. */
    $re = '/(<!--\s*' . preg_quote(sg_marker_start($block), '/') . '\b.*?-->)'
        . '(.*?)'
        . '(<!--\s*' . preg_quote(sg_marker_end($block), '/') . '\s*-->)/s';

    if (!preg_match($re, $html, $m)) {
        return array(false, $name . ' has no ' . sg_marker_start($block)
            . ' / ' . sg_marker_end($block) . ' comment pair. Nothing was changed.');
    }

    switch ($block) {
        case 'news':         $body = sg_render_news(sg_published_news());              break;
        case 'gallery':      $body = sg_render_gallery(sg_published_gallery());        break;
        case 'testimonials': $body = sg_render_testimonials(sg_published_feedback());  break;
        default:             return array(false, 'Unknown block "' . $block . '".');
    }

    /* Indent to wherever the start marker sits, so the generated markup lines
       up with the hand-written markup around it. */
    $indent = 0;
    $at = strpos($html, $m[1]);
    if ($at !== false) {
        $lineStart = strrpos(substr($html, 0, $at), "\n");
        $lineStart = $lineStart === false ? 0 : $lineStart + 1;
        $indent = strspn(substr($html, $lineStart, $at - $lineStart), ' ');
    }

    $replacement = $m[1] . "\n" . sg_indent($body, $indent) . "\n" . str_repeat(' ', $indent) . $m[3];

    /* preg_replace would read $1 and \0 in the generated markup as
       back-references. A literal single replacement avoids that entirely. */
    $updated = substr_replace($html, $replacement, $at, strlen($m[0]));

    if ($updated === $html) {
        return array(true, $name . ' is already up to date.');
    }

    if (!is_writable($file)) {
        return array(false, $name . ' is not writable. Give the web server write permission on it.');
    }

    /* LOCK_EX rather than a temp file and rename(): the file is being served
       at the same moment it is rewritten, and a rename on Windows can be seen
       by a concurrent read as a missing file. */
    if (@file_put_contents($file, $updated, LOCK_EX) === false) {
        return array(false, 'Could not write ' . $name . '.');
    }

    return array(true, $name . ' updated.');
}

/* Publish every block. Returns array(allOk, array of messages). */
function sg_publish_all() {
    $ok = true;
    $msgs = array();

    foreach (array_keys((array) sg_config('targets', array())) as $block) {
        list($good, $msg) = sg_publish_block($block);
        if (!$good) $ok = false;
        $msgs[] = ($good ? '' : 'FAILED: ') . $msg;
    }

    return array($ok, $msgs);
}

/* Called after every save so the site matches the panel without anybody
   having to remember to press Publish. The message is folded into the flash
   the caller is already setting, and only when something went wrong — a
   successful publish is the expected case and does not need saying twice. */
function sg_publish_after_save($block) {
    list($ok, $msg) = sg_publish_block($block);
    if (!$ok) sg_flash('warn', 'Saved, but the page was not updated. ' . $msg);
    return $ok;
}

/* Does the page still carry its markers? Shown on the dashboard so a page
   that was replaced by hand is noticed before somebody wonders why nothing
   they publish appears. */
function sg_target_status($block) {
    $targets = (array) sg_config('targets', array());
    $name = isset($targets[$block]) ? $targets[$block] : '';
    $file = $name ? sg_root() . '/' . $name : '';

    if (!$name)            return array('file' => '', 'state' => 'unset',      'note' => 'No page configured.');
    if (!is_file($file))   return array('file' => $name, 'state' => 'missing', 'note' => 'File not found.');

    $html = (string) @file_get_contents($file);
    if (strpos($html, sg_marker_start($block)) === false
        || strpos($html, sg_marker_end($block)) === false) {
        return array('file' => $name, 'state' => 'nomarkers',
            'note' => 'The SG-CMS marker comments are missing from this file.');
    }
    if (!is_writable($file)) {
        return array('file' => $name, 'state' => 'readonly', 'note' => 'Not writable by the web server.');
    }
    return array('file' => $name, 'state' => 'ok', 'note' => 'Ready.');
}
