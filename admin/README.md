# Website admin panel

Content management for **news**, the **gallery** and **visitor feedback**, plus the
accounts that may sign in.

---

## Getting in the first time

Open `/admin/` in a browser.

There is no default username and no default password anywhere in this code — a
shipped default is a published one. While no account exists the sign-in screen is
replaced by a **"Set up the admin panel"** form; the account created there is the
owner, and the setup form is unreachable from that moment on. Further
administrators are added from **Users** by somebody already signed in.

Nothing else has to be installed. The database creates itself on the first
request.

---

## What it publishes, and where

Saving anything rewrites the matching section of the website immediately. There
is no separate "publish" step to remember.

| In the panel | Section of the site |
|---|---|
| News | `news.html` — the *Latest News* section |
| Gallery | `gallery.html` — the tile grid and its lightbox |
| Feedback (approved only) | `about_us.html` — the *In Their Words* section |

Each of those three files carries a pair of marker comments:

```html
<!-- SG-CMS:news:start … -->
   … everything here is generated …
<!-- SG-CMS:news:end -->
```

**Everything between the markers is replaced on every save.** Everything outside
them is never touched, so the rest of each page can still be edited by hand.

If a page's markers are ever lost — a file replaced by an old backup, say —
the dashboard's *Where this panel publishes* table says so, and the page stops
being written to rather than being rewritten wrongly. Put the marker pair back
and press **Republish site**.

### Why it writes HTML rather than serving JSON

Every section of this site is wired to four scripts that read the DOM once, at
`DOMContentLoaded`, and never re-scan: `marine.js` (the reveal engine),
`marine-pages.js` (tilt, and the gallery lightbox), `page-fx.js` and
`scroll-drift.js`. Content injected later by a `fetch()` has missed all four —
the gallery would render and then not open, and the cards would sit at the
opacity their entrance animation starts from.

Writing real markup into the file means the content is in the DOM before any
script runs, so it animates and behaves exactly like markup typed by hand,
nothing in `js/` or `css/` has to change, and the pages stay indexable and keep
working with JavaScript off.

The cost is that the panel needs **write permission on those three `.html`
files**. Without it, publishing fails loudly and names the file.

---

## Feedback

The form on the website posts to `feedback-send.php`, which emails the office
**and** records the note here as *pending*. Nothing a visitor writes reaches the
About page until an administrator approves it.

The note is recorded before the email is attempted, so a message is kept even
when the mail is misconfigured or the host is blocking outbound SMTP.

Approving, rejecting and reordering all rewrite `about_us.html` at once.

---

## Roles

| | Owner | Editor |
|---|---|---|
| News, gallery, feedback | yes | yes |
| Create and remove administrators | yes | no |

The last active owner cannot be deleted, disabled or demoted, and nobody can
disable the account they are signed in as — so the panel cannot be locked out of
itself.

---

## Files

```
admin/            the panel
includes/         config, database, auth, publisher   (denied over HTTP)
data/             the SQLite database                 (denied over HTTP, gitignored)
uploads/          pictures added through the panel     (no script may execute here)
```

`data/` and `uploads/` hold per-installation state, not source. `data/` is in
`.gitignore`; the uploaded pictures are too.

---

## Moving to MySQL

The default is SQLite, which needs no server, no user and no password. To use
MySQL instead, **do not edit `includes/config.php`** — create
`includes/config.local.php` beside it:

```php
<?php
return array(
    'db' => array(
        'driver' => 'mysql',
        'host'   => 'localhost',
        'port'   => 3306,
        'name'   => 'sachdeva_cms',
        'user'   => 'sachdeva',
        'pass'   => '…',
        'charset' => 'utf8mb4',
    )
);
```

That file is in `.gitignore`, so the password is never committed and a `git
pull` never overwrites it. Create the empty database first; the tables build
themselves. The `db` block is replaced whole, so give all of its keys.

---

## Deploying

1. Upload everything.
2. Make `data/`, `uploads/`, and `news.html`, `gallery.html`, `about_us.html`
   writable by the web server (755/775 on folders, 644/664 on the files — the
   exact numbers depend on the host).
3. Open `/admin/` and create the owner account.
4. Press **Republish site** once and check the dashboard reports all three
   pages as *Ready*.

The `.htaccess` files under `includes/`, `data/` and `uploads/` are part of the
protection, not optional. Confirm after deploying that
`/includes/config.php` and `/data/content.sqlite` both return **403**.
