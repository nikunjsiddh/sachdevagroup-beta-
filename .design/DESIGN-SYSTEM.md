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

### Why the nav changed — do not "simplify" it back

Three pages (`our_credentials`, `testimonials`, `vision_mission`) carried a **richer** nav with
**About Us** and **Green Recycling** dropdowns; every other page had a reduced one. Those three were
the *only* route to `vision_mission.html` and `testimonials.html` anywhere on the site.

`_header.html` is now the **union** of both, so no page is orphaned:

- Home
- About Us ▾ — Group Profile · Vision & Mission · Our Credentials · Testimonials
- Our Companies ▾ — Sachdeva Steel Products (Ship Breakers) · Jai Jagdish Ship Breakers
- Green Recycling ▾ — Environment Management · Health & Safety · Waste Management
- News & Media ▾ — News · Gallery
- Contact

It also fixes, relative to the old markup: the dead `group_profile.html` target, the visible typo
**"Heatly & Safety"** → "Health & Safety", unterminated `&amp` entities, unclosed `<li>` elements,
and `data-logo="images/logo-white.png"` (a white logo on the white mobile menu bar, i.e. invisible).

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

### Sticky page nav (long pages only — about_us, sspsb, jjsb)
```html
<div class="mrnp-pagenav">
  <h5>On this page</h5>
  <ul><li><a href="#profile">Group Profile</a></li>…</ul>
</div>
```
Requires matching `id`s on the sections. Scrollspy is automatic.

## Reveal / animation attributes

- `data-mrn-reveal` — fade + rise on scroll. Variants: `="left" "right" "zoom" "clip"`.
- `data-mrn-stagger="120"` — on a **parent**; sets per-child delays.
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
6. No inline `<style>` blocks and no new CSS files. Everything you need is already in
   `marine.css` + `marine-pages.css`. If something is genuinely missing, note it in your report
   rather than inventing a one-off style.
7. The page must not scroll horizontally at 375px.
