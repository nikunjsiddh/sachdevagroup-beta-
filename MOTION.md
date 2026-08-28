# Motion — index.html

One engine: **GSAP 3.12.5 + ScrollTrigger**, driven by the single Lenis instance
`js/main.js` creates. Everything scroll-driven on the home page lives in
`js/motion.js`, with its base states and tokens in `css/motion.css`.

> **Scope.** This applies to `index.html` only. The 12 inner pages still run
> `js/marine.js` + `js/index-motion.js` + `js/page-fx.js` and are untouched.
> Read [Why nothing was deleted](#why-nothing-was-deleted) before changing
> either of the shared files.

---

## Attribute vocabulary

Everything is declarative. You should not need to open `js/motion.js` to add a
section — only to add a new *kind* of motion.

### Reveals — `data-anim`

Unchanged from the `js/sg-reveal.js` era. The CSS half still lives in
`css/index-theme.css` (section "SG REVEAL", lines 7628–7748); `js/motion.js`
only replaced the JavaScript that drives it.

| Attribute | On | Meaning |
|---|---|---|
| `data-anim="fade-up"` | any element | rise 44px + fade. 57 uses |
| `data-anim="fade-left"` / `"fade-right"` | any element | slide in ±44px |
| `data-anim="clip-up"` | an image wrapper | `inset(0 0 100%)` curtain, image un-zooms behind it |
| `data-d="0.12"` | any element | authored delay in seconds. **Always wins** |
| `data-stagger="0.14"` | a **parent** | spaces its `[data-anim]` descendants |

State classes, in order: `.in` → `.settled`. `.settled` zeroes `--d` so a hover
transition on the same element is instant instead of inheriting the stagger.

**Delay precedence** — `data-d`, else position inside the nearest
`[data-stagger]` container, else reading-order cascade at 0.085s.

> `js/sg-reveal.js` had a bug here worth not re-introducing: it wrote `--d` on
> every `data-stagger` child at boot and then overwrote it, for every element in
> a batch, with `data-d ?? i * 0.09`. An authored `data-stagger` therefore only
> survived when its children happened to enter the viewport in separate batches.

**Reveals fire once and never reverse.** `sg-reveal.js` re-armed elements once
they were fully off-screen and replayed the choreography on every pass. If you
scroll to the footer and back up now, the top of the page stays revealed.

### Parallax — `data-sg-parallax`

Three tiers. **Do not invent values** — put the element in the tier that matches
what it is.

| Tier | Use for | Travel |
|---|---|---|
| `far` | full-bleed backgrounds, plates, scrims | `yPercent` ±9 |
| `mid` | framed media, mosaics, card groups | `y` ±40 |
| `near` | headings, copy, CTAs — moves *against* the background | `y` ∓60 |

`band` is kept as an alias for `far` because it was already in the markup.

Two things differ from a naive reading of the spec, deliberately:

- Travel is **centred** (`-amp/2 … +amp/2`), not `0 … amp`. A layer overscanned
  symmetrically would otherwise spend its whole budget on one edge and expose
  the other.
- Each `far` layer's amplitude is **clamped to its measured overhang** on every
  `ScrollTrigger.refresh()`, with a 10% guard. `#journey .mrn-journey__plate`
  is why: `index-theme.css` gives it a fixed ±140px against a ~1700px section,
  under 9%, so a flat 18% tier would have pulled its edge into frame. Widening
  its overscan in `css/motion.css` and clamping in JS means it is safe at every
  width without anyone having to remember to check.

The current opposition on `#contact` is the point of the tier system:
`.mrn-cta__bg` is `far`, `.mrn-cta__orb--1` is `mid`, `.mrn-cta__orb--2` is
`near`. Before, both orbs drifted the same way, which is what made the band read
flat.

### The contained frame — `data-sg-frame`

The reference site's signature move. A full-bleed panel contracts into a framed
one, or a framed one opens out to full bleed, **while the media inside keeps its
own separate parallax**. Frame and contents moving at different rates is the
whole trick — the counter-move is not optional decoration.

| Value | Effect | Trigger window |
|---|---|---|
| `open` | `inset(12% 18% round 20px)` → `inset(0%)` | `top 88%` → `top 30%` |
| `close` | `inset(0%)` → `inset(8% 12% round 14px)` | section `top 50%`, `+=70%` |

Current callers: `.mrn-figure__frame` in `#about` is `open`; the largest mosaic
tile in `#yard` (`nth-child(5)`, 2 columns × 2 rows at every breakpoint) is
`close`.

**An element carries `data-anim` *or* `data-sg-frame`, never both.** They both
animate `clip-path` and will fight. `css/motion.css` has a defensive rule that
disables the frame clip if it ever finds both, but fix the markup instead.

### Everything else

`data-count`, `data-mrn-tilt`, `data-mrn-magnetic`, `data-mrn-marquee` still
belong to `js/marine.js` and are unchanged. On index.html the counters are
*started* by ScrollTrigger via `window.MRN.startCount(el)`, so a row of figures
counts as one movement; the animation itself is still marine's.

---

## Adding a section

1. Put `data-anim` on the things that should arrive, and `data-stagger` on their
   parent if they should arrive in sequence. That is usually all you need.
2. If it has a background layer, give it `data-sg-parallax="far"` and make sure
   it is overscanned. Check the result at 390px and 1920px.
3. If it has a hero image that deserves the frame move, use `data-sg-frame` and
   drop the `data-anim` from that element.
4. Only touch `js/motion.js` for genuinely bespoke behaviour. Add it as a
   function, call it from `run(scale, full)`, and keep it inside the
   `gsap.matchMedia()` contexts so it reverts cleanly.

Each section function takes `(scale, full)`: `scale` is the parallax amplitude
multiplier (1 desktop, 0.45 at ≤1024px) and `full` gates the expensive-only-on-
desktop extras such as the 3D card settle.

---

## Tuning the depth tiers

`js/motion.js`:

```js
var TIER = {
    far:  { prop: 'yPercent', amp: 18 },
    band: { prop: 'yPercent', amp: 18 },
    mid:  { prop: 'y',        amp: 80 },
    near: { prop: 'y',        amp: -120 }
};
```

`amp` is the **total** travel. Raising `far` above ~18 means auditing every
`far` layer's overscan — the clamp will silently reduce any layer that cannot
afford it, so a layer that stops responding is telling you it has no headroom,
not that the tween is broken.

---

## Why nothing was deleted

`js/marine.js` and `js/index-motion.js` look like they have dead code in them.
Measured on `index.html` they do. Measured across the site they do not:

| Attribute | index.html | The other 12 pages |
|---|---|---|
| `data-mrn-reveal` | 0 | **70** |
| `data-mrn-stagger` | 0 | **25** |
| `data-sg-split` | 0 | **39** |
| `data-sg-in` | 0 | **12** |

`js/page-fx.js` also rides `window.SGMotion`'s shared loop for its parallax,
scrollspy and progress scrubbing. Removing those "dead" observers would leave
**107 elements on 12 pages stuck at `opacity: 0` permanently.**

So both files keep every line and stand down by flag:

```js
var gsapOwns = window.SG_MOTION_ENGINE === 'gsap';
```

set only by the shim in `index.html`'s `<head>`. `marine.js` skips the progress
bar, the parallax handler, the timeline fill, its counter observer and the
`#credentials` marquee. `index-motion.js` returns at the top of its first IIFE —
which also disarms its parallax module for free, because that module's own boot
bails on a missing `window.SGMotion`.

**If you add `js/motion.js` to another page, that page's `data-mrn-*` and
`data-sg-*` elements stop animating.** Port them to `data-anim` first.

---

## The gates

Two classes on `<html>`, both set by the head shim before any stylesheet
resolves, both pulled again after 4s unless their engine reports in:

| Class | Gates | Cleared unless |
|---|---|---|
| `sg-anim` | the `[data-anim]` hidden states | `html[data-mo-ready]` |
| `sg-motion` | `index-motion.js`'s `[data-sg-in]` states | `html[data-sg-ready]` |

This is the no-JS contract and it is load-bearing. **Nothing may be hidden by
CSS that JavaScript is not guaranteed to reveal.** If GSAP fails to load,
`js/motion.js` returns at its first guard and drops `sg-anim` immediately; the
page reads as plain static HTML. Test it by blocking `cdnjs.cloudflare.com`.

---

## Performance notes

- Only `transform`, `opacity` and `clip-path` are animated. The progress bar was
  `style.width` and the timeline fill was `style.height`; both are now
  composited. The timeline uses `clip-path` rather than `scaleY` on purpose —
  scaling would compress the cyan gradient into the first few pixels and grow
  the glow blur as the line advanced.
- `will-change` is added on enter and removed on leave via `.mo-active`. It is
  never parked on a selector.
- Reveal triggers are `once: true` and self-destruct. Measured: **113
  ScrollTriggers at load, 36 after a full scroll.**
- `ScrollTrigger.refresh()` runs after `document.fonts.ready`, `window.load`,
  the hero video's `loadedmetadata`, and a 200ms-debounced `resize`.

---

## Testing

`node tools-mktest.js` writes `_mtest.html` — a throwaway copy of `index.html`
for browser testing. Both files are gitignored. It exists because a machine
whose OS is set to **reduce motion cannot see any of this work**: Lenis,
`marine.js`, `index-motion.js`, `motion.js` and ~22 CSS media blocks all switch
to their reduced paths, and the reduced blocks carry `!important` rules that beat
GSAP's inline styles. The harness therefore patches **both** layers — it shims
`window.matchMedia` and serves copies of the stylesheets with the
reduced-motion blocks stripped — and cache-busts every local asset, because the
dev server sends no cache headers.

Three traps it encodes, each of which cost a full test cycle:

- `/reduce/` also matches the feature *name* `prefers-reduced-motion`, so a
  naive shim answers `(prefers-reduced-motion: no-preference)` with `false` and
  GSAP's matchMedia contexts never fire.
- A compound query like `(min-width:1025px) and (prefers-reduced-motion:no-preference)`
  must still honour the width half. Answering it `true` regardless ran **both**
  matchMedia contexts at once and doubled every ScrollTrigger on the page.
- The `#process` bug below was invisible on a reduce-motion machine, because the
  reduced-motion block sets the very elements it breaks back to `opacity: 1`.

`node tools-mkinner.js <page.html> …` does the cache-busting half for the inner
pages, which is what you want after editing any of the three shared JS files.

## A bug this fixed

`#process`'s four step icons, headings and paragraphs are `opacity: 0` in
`css/index-theme.css`, lifted only under `#process .mrn-flow.mrn-in`. That class
is added by `js/marine.js` for `[data-mrn-reveal]` elements — and `index.html`
has none, so it never arrived. **Every visitor not running reduce-motion saw
four empty cards.** `js/motion.js` adds the class the CSS was already waiting
for. If you ever remove that, put the reveal back some other way first.

## Known gaps

- **GSAP is loaded from cdnjs.** Pinned to 3.12.5. Vendoring it into `js/` would
  remove a third-party dependency and a DNS round trip from every page load;
  worth doing before launch.
- **`css/animate.min.css` is 71 KB for two class names.** `js/main.js` adds
  `.animated .fadeInDown` to the header when it becomes sticky, and nothing else
  on index.html uses the library. Replacing that one keyframe with a local rule
  would drop the whole file.
- **CLS, Lighthouse and sustained-framerate figures have not been measured** —
  they need a real profiling run in a browser, which the environment this was
  built in could not do.
