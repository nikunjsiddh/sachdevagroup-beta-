# Sachdeva Group — Marine Design System

Reference for converting inner pages. **Read this fully before editing any page.**

## The client & the category

Heavy-industrial **B2B maritime — ship recycling / ship breaking yard operator** at Alang,
Gujarat, India. Operating since 1983 across two units: Sachdeva Steel Products (Ship Breakers) LLP
and Jai Jagdish Ship Breakers Pvt. Ltd.

Audience: **ship owners, cash buyers, flag states, classification societies, regulatory auditors.**

That dictates the tone. Premium here means *engineered, precise, compliant, substantial* — deep
navy, controlled gold accents, blueprint grids, real depth. It does **not** mean playful, pastel,
rounded-bubbly, or consumer-app. Motion must feel like heavy machinery: weighty easing, nothing
bouncy or cartoonish. Never invent certifications, tonnages, dates or client names — this is a
regulated sector and every claim on the page must already exist in the current markup.

## Palette (do not introduce new colours)

| Token | Value | Use |
|---|---|---|
| `--navy` | `#00008e` | primary brand |
| `--navy-deep` / `--navy-ink` | `#050a2e` / `#03061c` | dark section grounds |
| `--teal` | `#017280` | secondary brand |
| `--aqua` | `#b2ecff` | cool highlight |
| `--gold` / `--gold-light` | `#ffad18` / `#ffcc29` | accent, CTAs, numerals |
| `--grey` | `#5d5c5c` | body copy |

Font is **Oswald** throughout. Already loaded.

## The layer stack — read this before adding any CSS

Five override layers, applied in this order. Each one only says what the layer
above it could not:

| Layer | Owns | Scope |
|---|---|---|
| `css/marine.css` | base `.mrn-*` kit, legacy `:root` tokens | all pages |
| `css/marine-pages.css` | inner-page `.mrnp-*` components — layout | all pages |
| `css/header-modern.css` / `footer-modern.css` | the shared bars | all pages |
| `css/index-theme.css` | rethemes `:root` + every `.mrn-*` to the industrial palette; `#index-section` rules | all pages, but written for index |
| `css/page-fx.css` | rethemes the `.mrnp-*` components to match, adds `.pfx-*`, extends the entrance vocabulary | **inner pages only** |

`index-theme.css` contains **zero** `.mrnp-` selectors. That is why `page-fx.css`
exists: without it an inner page gets the new tokens for type and ground but
every card, frame, quote and field still renders in the retired `#00008e` navy
with 20px radii. Do not "fix" that by editing `marine-pages.css` — it is the
layout layer and index depends on nothing in it.

**`page-fx.css` and `js/page-fx.js` must never be loaded on `index.html`.**
The JS returns immediately if it sees `.mrn-hero`, but do not rely on that.

### Never reuse an id that index-theme.css styles

`index-theme.css` scopes rules by section id: `#about`, `#commitment`,
`#companies`, `#contact`, `#credentials`, `#journey`, `#process`, `#yard`.
Those ids are index.html's. An inner page that reuses one inherits index's
rules at id specificity, which no class selector in `page-fx.css` can outrank.
This was live: `#credentials .mrn-btn { width: 100% }` was stretching the "All
Credentials" button on `about_us.html` to 562px. The inner pages now use
`#units`, `#creds`, `#reach`, `#yard-details`, `#hs-commitment` instead.
Before adding a section id, grep `css/index-theme.css` for it.

## File wiring — every page must end up byte-identical here

An audit found **six different script blocks and no two matching head blocks** across the site, and
the brand font **Oswald missing from 11 of 13 pages**. So these are now canonical files — do not
hand-roll them.

1. **`<head>`** — replace the page's entire stylesheet/font block with `.design/_head.html` verbatim.
   It keeps `<title>`, `<meta>` and any page-specific tags untouched; only the `<link>` block is
   replaced. Note it ends with `marine.css` then `marine-pages.css` — that order matters.

2. **First element inside `<body>`:**
   ```html
       <!-- ====== reading progress ====== -->
       <div class="mrn-progress" id="mrnProgress"></div>
   ```
   followed by the existing `#toTopBtn` anchor.

3. **Closing scripts** — replace the page's entire script block with `.design/_scripts.html` verbatim.

Pages currently loading `js/ybox.js`, `css/yBox.min.css`, `js/inline_scripts.js`, `js/scroll.js` or a
Splide init: drop them. Their jobs (lightbox, carousels, scroll effects) are all covered by
`marine.js` + `marine-pages.js`, and leaving them in means two systems fighting over the same
elements. `js/modernizr-3.5.0.min.js` is referenced but absent from `js/` — it sits inside an
`<!--[if lt IE 9]>` block so it never fetches; drop it with the rest.

## Shared blocks — copy verbatim, do not restyle

- Head links: `.design/_head.html`
- Header/nav: `.design/_header.html`
- Footer: `.design/_footer.html` (replaces the old `<footer class="footer">…</footer>` entirely)
- Scripts: `.design/_scripts.html`

All four are identical on every page. Copy them byte for byte.

### The nav

- Home
- **About Us** — a single link, no dropdown
- Companies ▾ — Sachdeva Steel Products · Jai Jagdish Ship Breakers
- Operations ▾ — Environment Management · Health & Safety · Waste Management
- Credentials
- News & Media ▾ — News · Gallery
- Contact Us

Identical on all 13 pages. `js/marine.js` `initNavActive()` marks the current page's `<li>` with
`.mrn-nav-active` by comparing the last path segment, so a plain `<li><a>` is all a top-level entry
needs.

**About Us was a three-item dropdown** — Group Profile · Vision & Mission · Testimonials — even
though `about_us.html` already contained all three as sections (`#profile`, `#vision`,
`#testimonials`). The dropdown was describing a split that did not exist in the content. It is now
one link, and the page carries a `.pfx-jump` rail as its own table of contents. The footer's
"Vision & Mission" and "Testimonials" entries point at `about_us.html#vision` and
`about_us.html#testimonials`.

> **`vision_mission.html` and `testimonials.html` are now unlinked.** They still render, and
> nothing 404s, but nothing points at them either. They duplicate what `about_us.html` says.
> Decide with the client: delete them, or add
> `<link rel="canonical" href="about_us.html">` to each so search engines are not offered two
> pages for the same copy. Do not simply leave the question open.

An earlier pass fixed, relative to the original markup: the dead `group_profile.html` target, the
visible typo **"Heatly & Safety"** → "Health & Safety", unterminated `&amp` entities, unclosed
`<li>` elements, and `data-logo="images/logo-white.png"` (a white logo on the white mobile menu
bar, i.e. invisible). Keep all of those fixed.

## Page skeleton

```html
<body>
  <div class="mrn-progress" id="mrnProgress"></div>
  <a id="toTopBtn" title="Go to top" href="javascript:void(0)"><i class="fa fa-chevron-up"></i></a>
  <div class="wrapper">
    <header class="header">…from _header.html…</header>

    <!-- PAGE HERO -->
    <section class="mrnp-hero">
      <div class="mrnp-hero__bg" style="background-image:url('images/about/about-head-bg3.jpg')"></div>
      <div class="mrnp-hero__scrim"></div>
      <div class="mrnp-hero__grid"></div>
      <span class="mrnp-hero__orb mrnp-hero__orb--a"></span>
      <span class="mrnp-hero__orb mrnp-hero__orb--b"></span>
      <div class="mrnp-hero__inner">
        <div class="mrn-container">
          <nav class="mrnp-crumb">
            <a href="index.html">Home</a><span class="sep">/</span><strong>Page Name</strong>
          </nav>
          <h1 class="mrnp-hero__title" data-mrnp-split-words>Page Name</h1>
          <p class="mrnp-hero__sub">One or two sentences drawn from the page's own copy.</p>
          <div class="mrnp-hero__rule"></div>
        </div>
      </div>
      <div class="mrnp-hero__wave">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#ffffff" d="M0,40 C240,80 480,8 720,34 C960,60 1200,12 1440,42 L1440,80 L0,80 Z"/>
        </svg>
      </div>
    </section>

    <!-- CONTENT SECTIONS -->
    <section class="mrnp-section mrn-light"> <div class="mrn-container"> … </div> </section>

    <footer class="footer-enhanced">…from _footer.html…</footer>
  </div>
  … scripts …
</body>
```

Hero background image: pick from `images/about/about-head-bg0|1|3|4|5|6.jpg|png` — use the same one
the page's old `page-titleN` class used, so the visual identity of each page is preserved.
The wave `fill` must match the background colour of the section that follows the hero
(`#ffffff` for `mrn-light`, `#f5f7fa`-ish for `mrn-soft` — use `#ffffff` if unsure).

## Section grounds — alternate them so the page has rhythm

- `.mrnp-section.mrn-light` — white
- `.mrnp-section.mrn-soft` — subtle blue-grey gradient
- `.mrnp-section.mrn-dark` — deep navy→teal, white text

Never place two identical grounds back to back.

## Components

Full CSS in `css/marine-pages.css`; behaviour in `js/marine-pages.js`.

### Prose
```html
<div class="mrnp-prose mrnp-prose--lead">
  <p>Lead paragraph — gets a gradient drop cap and larger navy type.</p>
  <p>Following paragraphs.</p>
</div>
```
Use `--lead` only on the **first** prose block of a page.

### 3D tilt icon cards
```html
<div class="mrnp-grid mrnp-grid--3" data-mrn-stagger="120" data-mrn-reveal>
  <article class="mrnp-icard" data-mrnp-tilt="9">
    <div class="mrnp-icard__icon"><svg …>…</svg></div>
    <h4>Heading</h4>
    <p>Body copy.</p>
    <span class="mrnp-icard__no">01</span>
  </article>
  …
</div>
```
`data-mrnp-tilt` gives real perspective tilt; children lift on `translateZ` on hover. Grid variants:
`--2 --3 --4`. If the source block already has icons (`images/environment-management/*.png`), reuse
them inside `.mrnp-icard__icon` as `<img>`.

### 3D flip card (use sparingly — for paired statements like Vision / Mission)
```html
<div class="mrnp-flip">
  <div class="mrnp-flip__inner">
    <div class="mrnp-flip__face mrnp-flip__face--front"><h4>Vision</h4><p>…</p></div>
    <div class="mrnp-flip__face mrnp-flip__face--back"><h4>Vision</h4><p>full text…</p></div>
  </div>
</div>
```

### Image / text split
```html
<div class="mrnp-split mrnp-split--wide-left">
  <div class="mrnp-split__media" data-mrn-tilt="8">
    <div class="mrnp-split__frame"><img src="…" alt="…"></div>
    <span class="mrnp-split__tag">Caption</span>
  </div>
  <div> …heading + .mrnp-prose… </div>
</div>
```

### Check list
```html
<ul class="mrnp-checks mrnp-checks--2"><li>Point</li>…</ul>
```

### Accordion
```html
<div class="mrnp-acc" data-mrnp-single>
  <div class="mrnp-acc__item is-open">
    <button class="mrnp-acc__head" type="button">Question<span class="mrnp-acc__sign">+</span></button>
    <div class="mrnp-acc__panel"><div class="mrnp-acc__panel-inner">Answer</div></div>
  </div>
</div>
```
`data-mrnp-single` = only one panel open at a time. Mark the first item `is-open`.

### Gallery (with lightbox)
```html
<div class="mrnp-gal" data-mrn-stagger="80" data-mrn-reveal>
  <a class="mrnp-gal__item" data-mrnp-lightbox="images/gallery/1.jpg" data-mrnp-caption="Primary cutting zone">
    <img src="images/gallery/1.jpg" alt="Primary cutting zone">
    <span class="mrnp-gal__zoom"><svg …magnifier…></svg></span>
    <span class="mrnp-gal__cap">Primary cutting zone</span>
  </a>
</div>
```
The lightbox (prev/next/esc/counter) is built automatically from all `[data-mrnp-lightbox]` on the page.

### News cards
`.mrnp-news > .mrnp-post > .mrnp-post__pic (+ .mrnp-post__date) + .mrnp-post__body`

### Testimonials
`.mrnp-quotes > .mrnp-quote > p + .mrnp-quote__by > .mrnp-quote__av (initials) + div > strong + span`

### Certificates
`.mrnp-certs > .mrnp-certcard[data-mrnp-lightbox] > img + .mrnp-certcard__bar`

### Contact
`.mrnp-contact` = 2 columns. Left: stacked `.mrnp-infocard`s. Right: `.mrnp-form`.
```html
<div class="mrnp-field">
  <input type="text" id="name" name="name" placeholder=" " required>
  <label for="name">Your Name</label>
  <span class="mrnp-field__line"></span>
</div>
```
`placeholder=" "` (a single space) is **required** — the floating label uses `:not(:placeholder-shown)`.
Keep the existing `<form action="…">` target, method and field `name` attributes exactly as they are;
only restructure the markup around them.

Map: wrap the existing iframe in `<div class="mrnp-map">…</div>`.

### Stat strip
`.mrnp-strip > div > strong + span`. For animated counting use
`<strong><span data-count="71">0</span>+</strong>` — `js/marine.js` animates any `[data-count]`.
**Only use numbers that already appear in the page's own copy.**

### `.pfx-*` — added by `css/page-fx.css`

Four components, each with a real caller. **If a caller goes away, delete the
component** — the file was pruned once already to keep that true.

```html
<!-- status / empty state. Caller: news.html -->
<div class="pfx-note"><p>…</p><p>…</p></div>

<!-- numbered process spine. Caller: waste_management.html #procedure.
     data-pfx-progress fills the spine as the reader descends. -->
<ol class="pfx-steps" data-pfx-progress>
  <li class="pfx-step">
    <div class="pfx-step__no">01</div>
    <div class="pfx-step__body">
      <span class="pfx-step__icon"><svg …></svg></span>
      <p>Step copy.</p>
    </div>
  </li>
</ol>

<!-- running rail. Caller: our_credentials.html #certificates.
     data-mrn-marquee makes marine.js double the track; the keyframe travels
     -50%, so ONE written pass must already be wider than .mrn-container or
     the loop shows a gap at the wrap. Write the set out twice. -->
<div class="pfx-marquee">
  <div class="pfx-marquee__track" data-mrn-marquee>
    <span class="pfx-marquee__item">ISO 9001:2015</span>…
  </div>
</div>

<!-- hero scroll cue. Caller: every inner page with a .mrnp-hero, last child
     before the wave. -->
<div class="pfx-cue" aria-hidden="true"><span>Scroll</span><i></i></div>

<!-- sticky in-page rail. Caller: about_us.html, directly after the banner.
     Scrollspy, scroll-padding and the .wrapper unblock are all handled by
     js/page-fx.js railSpy(); the markup is just links to section ids. -->
<nav class="pfx-jump" aria-label="On this page">
  <div class="pfx-jump__inner">
    <a href="#profile">Group Profile</a>…
  </div>
</nav>

<!-- seam wave. Caller: about_us.html, after the rail. Ink ground, white
     curve — the same path the .mrnp-hero__wave uses. Only needed when
     something sits between the banner and the first section. -->
<div class="pfx-wave" aria-hidden="true">
  <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
    <path fill="#ffffff" d="M0,40 C240,80 480,8 720,34 C960,60 1200,12 1440,42 L1440,80 L0,80 Z"/>
  </svg>
</div>
```

### The About banner

`about_us.html` uses the shared `.mrnp-hero` component like every other inner page — a **still
photograph**, not footage. The image is `images/about/about-head-bg1.png`, the About banner the
page originally shipped with, and the only asset in `images/about/` shaped as a banner strip
(2050×688). It is a 1.6 MB PNG; converting it to WebP would be worth doing.

What it adds over a standard page hero is two pieces borrowed from index's hero —
`.mrn-hero__badge` and `.mrn-hero__actions`. Both are class-scoped in `index-theme.css`, so they
compose inside `.mrnp-hero` with only spacing declared in `page-fx.css` section 6.4.

**The wave is not inside the hero on this page.** The sticky `.pfx-jump` rail sits between the
banner and the content, and a white curve on top of a dark bar reads as a mistake. The wave is
lifted out into `.pfx-wave`, which carries its own ink ground. Order is
**banner → rail → wave → first section**, and the curve does the same job it does everywhere
else: takes dark into white.

`js/page-fx.js` guards on `.mrnp-section`, **not** on `.mrn-hero` — leave that test alone.

### `position: sticky` needs `.wrapper` unblocked

`.wrapper` ships `overflow: hidden`, which makes it the scrollport for any sticky descendant — and
it never scrolls, so a sticky element just scrolls away (measured: the rail's top reached
-1803px). `js/page-fx.js` adds `.has-jump-rail` when a rail exists, and `page-fx.css` switches that
wrapper to `overflow-x: clip; overflow-y: visible` inside an `@supports (overflow-x: clip)` guard.
The guard is load-bearing: without `clip`, a browser would drop that declaration and keep
`overflow-y: visible` against `overflow-x: hidden`, and a pair with one axis visible computes the
visible one to `auto` — the wrapper would grow its own vertical scrollbar.

Data tables (`.table-responsive > table`, the ships-recycled lists) need **no
class** — `page-fx.css` section 6.4 restyles them where they sit, unwinding the
old `css/style.css` navy-gradient treatment.

### Sticky page nav (long pages only — about_us, sspsb, jjsb)
```html
<div class="mrnp-pagenav">
  <h5>On this page</h5>
  <ul><li><a href="#profile">Group Profile</a></li>…</ul>
</div>
```
Requires matching `id`s on the sections. Scrollspy is automatic.

## Reveal / animation attributes

Two engines run on an inner page and they must not overlap:

**`js/index-motion.js`** owns entrances — one IntersectionObserver, one rAF
loop, published as `window.SGMotion`. Vocabulary: `data-sg-in`, `data-sg-delay`,
`data-sg-split`.

**`js/marine.js`** owns behaviours — tilt, magnetic, counters, marquee, and its
own older `data-mrn-reveal` entrance.

### You almost never write `data-sg-*` by hand

`js/page-fx.js` runs before `index-motion.js` and stamps the entrance
attributes from a table of selectors (`RULES`, near the top of that file). Card
grids sweep row by row, lists step one at a time, headings split into words,
image frames clip in. To change how a component enters, edit that table — not
twelve HTML files.

It skips anything already carrying `data-sg-in` / `data-sg-split` in the
markup, so **a hand-authored attribute always wins**. It also skips anything
carrying `data-mrn-tilt`, `data-mrn-magnetic` or `data-mrn-parallax`, because
`marine.js` writes an inline transform on those and an entrance is also a
transform. Where it does claim an element it strips that element's
`data-mrn-reveal`, and its container's `data-mrn-reveal` / `data-mrn-stagger`,
so only one engine animates a given subtree.

> `data-mrn-stagger` was never doing anything on these pages. It writes
> `--mrn-delay` onto each child, but `marine.css` only transitions elements
> that carry `[data-mrn-reveal]` themselves — and the children do not. Grids
> faded in as one block. Prefer the `page-fx.js` table.

### Attribute reference

- `data-sg-in` — `up` (default) `left` `right` `zoom` `rise` `tilt` `sink` `clip`.
  The last four are added by `page-fx.css`; a new direction is one `--sg-from`
  line in section 7 of that file.
- `data-sg-delay="1".."10"` — 110ms per step. 7-10 come from `page-fx.css`.
- `data-sg-split` — splits a heading into per-word, per-line staggered rise.
- `data-pfx-progress` — the element gets `--pfx-p` 0→1 across its own travel
  through the viewport. Drives the `.pfx-steps` spine.
- `data-mrn-reveal` — the older engine. Still fine on anything the table does
  not claim. Variants: `="left" "right" "zoom" "clip"`.
- `data-mrn-stagger="120"` — on a **parent**; sets per-child delays. See the
  note above before reaching for it.
- `data-mrn-tilt="8"` — tilts a `.mrn-figure__frame` / `.mrnp-split__frame` child.
- `data-mrnp-tilt="9"` — tilts the element itself with `translateZ` children (icards, certcards).
- `data-mrn-magnetic` — button follows the cursor slightly.
- `data-mrn-parallax="0.15"` — layer drifts on scroll.
- `data-count="71"` — counts up when scrolled into view.
- `data-mrnp-split-words` — splits an H1 into per-word rise-in animation.

Do **not** stack `data-mrn-reveal` on both a parent and each of its children — put it on the parent
with `data-mrn-stagger`.

Strip all legacy `data-aos="…"` / `data-aos-duration="…"` attributes from blocks you convert; the
two systems fight each other. AOS stays loaded only for any block you leave untouched.

## Known site-wide defects — fix these on the page you own

A content audit of all 12 live pages found these. Fix the ones that touch your page.

1. **Dead nav link.** The shared header's About Us dropdown links to `group_profile.html`, which
   **does not exist** (confirmed 404). The real file is `about_us.html`. Present on `our_credentials.html`,
   `testimonials.html`, `vision_mission.html`. Using `_header.html` verbatim fixes this — that
   snippet is already correct.
2. **`vision_mission.html` has no `<footer>` at all** — it ends at a bare `<div class="copyright">`.
   It gets the full `_footer.html`.
3. **Trailing-hyphen class names that silently kill styling.** `vission-mission-block-`,
   `companies-contact-block-`, `container-`, and `data-aos="fade-down-"` / `data-aos-duration="2000-"`.
   These blocks currently render unstyled. They're being rebuilt onto the new system anyway — just
   don't carry the broken names across.
4. **`testimonials.html`: `<p class="write">` opens at line 187 and is never closed.**
5. **Missing stylesheets on some pages** — `css/footer.css`, `css/slider.css`, `css/aos.css`, and on
   `news.html` the **Oswald font itself** is not loaded. Every page must load the identical head block.
6. **Mechanical copy typos.** Fix ONLY these unambiguous mechanical defects:
   - `environment_management.html`: "align withBasel Convention" → missing space after "with"
   - `our_credentials.html`: "ISO 30000:2009, ISO 9001:2015, 14001:2015 & 45001:2018" → the last two
     are missing their "ISO" prefix
   - `about_us.html`: final sentence missing its full stop
   - `waste_management.html`: "Sachdeva Group first priority" → missing possessive apostrophe

   **Anything requiring judgment, leave alone and report it.** For example
   `waste_management.html` contains "can readily lead to adverse the health & environment", which is
   not a grammatical sentence — but rewriting it means guessing what the client meant. Report it;
   do not rewrite it. Never touch a number, date, tonnage, certification, standard or client name.

## Two pages are unfilled template scaffolding — read this before touching them

`gallery.html` and `news.html` were never populated with real content. They still carry the original
theme's stock photos, with alt text reading **"Rock Concert", "Ballet", "Stand Up Comedy",
"Theater Performance", "Jazz Concert"** — concert and dance imagery on a ship-breaking company's
website. Their only real copy is the headings "Show Gallery" and "Latest News".

**`gallery.html`** — remove the concert filler entirely and rebuild the grid from the client's own
yard photography that genuinely exists on disk: `images/gallery/1.jpg`–`6.jpg`, plus
`images/ship-bg.webp`, `images/s3.webp`, `images/container.webp`, `images/ship-front.webp`,
`images/environment.jpg`, `images/health.jpg`, `images/waste.jpg`, `images/ship_recycling.jpg`.
Caption each one factually for what a ship recycling yard shows (beaching, primary cutting zone,
block handling, plate recovery, waste segregation, yard overview). Use the `.mrnp-gal` component
with the lightbox. Verify every file exists before referencing it.

**`news.html`** — there are **no real news items**. Do **not** invent press releases, dates,
headlines or article copy for a regulated company. Build the premium page shell (hero, section
structure, and a dignified "no articles published yet" empty state pointing to the contact page),
and say clearly in your notes that real editorial content is required from the client. An honest
empty state is correct here; fabricated news is not.

## Hard rules

1. **Never invent or alter copy.** Move the existing words into new markup. Fixing an obvious
   typo in visible text is fine; rewriting a claim is not.
2. **Preserve every real link and every form field name/action/method.**
3. **Preserve `<title>` and any meta tags.**
4. Delete only: `data-aos` attributes, commented-out dead markup, the old `<footer class="footer">`,
   the legacy `page-titleN` banner section, and duplicated blocks.
5. Keep all images that are in use. Do not reference an image that does not exist on disk —
   check `images/` first.
6. No inline `<style>` blocks. New rules go in `css/page-fx.css`, which is the
   inner-page override layer; do not start a sixth stylesheet and do not edit
   `marine-pages.css` or `index-theme.css` to fix an inner page.
7. The page must not scroll horizontally at 375px.
8. Do not give a section an id that `css/index-theme.css` styles — see
   "Never reuse an id" above.
9. One transform owner per element. `marine.js` (tilt / magnetic / parallax),
   `index-motion.js` (entrances) and any scroll scrub all write `transform`;
   two of them on one element is a silent fight, and a CSS `animation` on
   transform beats an inline write outright — which is why
   `page-fx.css` sets `animation: none` on `.mrnp-hero__bg`.
