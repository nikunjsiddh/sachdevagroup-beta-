# Website admin panel

Content management for **news**, the **gallery**, the **certificates** on the
credentials page, the **testimonials** on the About page and the **complaints**
the website form collects, plus the accounts that may sign in.

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
| Certificates | `our_credentials.html` — the certificate scan grid |
| Testimonials (published only) | `about_us.html` — the *In Their Words* section |
| Complaints | nowhere — see below |

Each of those four files carries a pair of marker comments:

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

The cost is that the panel needs **write permission on those four `.html`
files**. Without it, publishing fails loudly and names the file.

---

## Gallery and certificates

Both are the same shape: a picture, the line printed across it, and an optional
longer caption for the lightbox. The add form asks for all three, so a tile
never goes live under a caption guessed from a filename — leave the caption
empty and the guess is still what you get, but you have been shown the field.

Several files can be added at once. With a caption typed above them it is
numbered across the batch (*Beaching 01*, *Beaching 02*); with none it comes
from each filename.

The six certificate scans and six photographs those two pages carried by hand
are copied into the database on the first request, so the panel opens showing
what is already live rather than an empty section. That copy happens once and
is recorded as having happened — deleting every item in a section leaves it
empty and publishes the section's "nothing published yet" note, rather than
the originals reappearing on the next page load.

---

## Testimonials and Complaints are two different things

They used to be one list with one *Approve* button, and that button meant two
incompatible things: *print this on the About page* for a testimonial and *we
have dealt with this* for a message from a visitor. They are separate sections
now, with separate tables.

**Testimonials** are the cards in *In Their Words*. The company chose them, they
are ordered by hand, and publishing one is a decision somebody makes. This is
the only one of the two that reaches a visitor's screen.

**Complaints** is the postbag: everything sent through *Tell us how we did* on
the website, complaints included, with the mobile number and the address it came
from. **None of it is ever published.** It is read, answered, and marked
resolved. Notes can also be recorded here by hand when somebody rings the office.

A note worth printing is moved with **Use as testimonial**, which opens the
testimonial form with the words filled in and the publish box *unticked* — so
printing a stranger's words is still a second, deliberate step.

### What happens to what is already stored

The split runs itself, once, on the first request after this code is installed.
The rule is that **whatever is on the About page today stays on it**: every
approved note becomes a published testimonial whichever way it arrived, and
everything else from the website form becomes a complaint. The old `sg_feedback`
table is left in place, unread, so the split can be checked afterwards; it can be
dropped by hand once it has been.

### Feedback is no longer lost to a mail failure

`feedback-send.php` writes the note to the complaints book **before** it tries to
send anything. There are two destinations and the send succeeds if either one
works, so an unconfigured `mail-config.php` or a host blocking outbound SMTP no
longer shows the visitor a red error about a message that did in fact arrive —
it is logged for whoever runs the server, and the visitor is told the truth.

A note that reached neither the database nor the mail server still reports a
failure, because that one really did fail.

---

## Roles

| | Owner | Editor |
|---|---|---|
| News, gallery, certificates, testimonials, complaints | yes | yes |
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
2. Make `data/`, `uploads/`, and `news.html`, `gallery.html`,
   `our_credentials.html`, `about_us.html` writable by the web server
   (755/775 on folders, 644/664 on the files — the exact numbers depend on the
   host).
3. Open `/admin/` and create the owner account.
4. Press **Republish site** once and check the dashboard reports all four
   pages as *Ready*.

The `.htaccess` files under `includes/`, `data/` and `uploads/` are part of the
protection, not optional. Confirm after deploying that
`/includes/config.php` and `/data/content.sqlite` both return **403**.
