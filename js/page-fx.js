/* ==========================================================================
   SG PAGE FX — scroll choreography for every page except index.html
   ==========================================================================
   Load order (end of <body>):
       … marine.js  →  marine-pages.js  →  page-fx.js  →  index-motion.js
   It MUST sit before index-motion.js. Nothing here starts a loop, an observer
   or a listener of its own; it is two things only:

     1. A CHOREOGRAPHER that runs synchronously at parse time and stamps
        data-sg-in / data-sg-delay / data-sg-split onto the page's content, so
        that by the time index-motion.js boots on DOMContentLoaded its single
        IntersectionObserver already has a full page to work with. index.html
        carries those attributes by hand in the markup; twelve inner pages
        cannot be hand-annotated element by element without the vocabulary
        drifting, so they are annotated from one table instead — see RULES.

     2. Two SCRUBBERS that subscribe to window.SGMotion, the shared rAF loop
        index-motion.js publishes. SGMotion.track() batches every rect read
        for the frame before any callback writes, so adding subscribers costs
        no extra layout.

   WHY THE STAGGER IS BEING TAKEN OVER
   The markup pairs data-mrn-stagger on a grid with data-mrn-reveal on the same
   grid. marine.js writes --mrn-delay onto each child, but marine.css only
   transitions elements that carry [data-mrn-reveal] themselves, and the
   children do not — so the delay lands on elements with nothing to delay and
   the whole grid fades as one block. Stamping each child individually is what
   actually produces the per-card sweep those attributes were reaching for.
   Where this file takes a container over it removes that container's
   data-mrn-reveal / data-mrn-stagger, because leaving them would mean two
   engines animating the same subtree.

   WHAT IT WILL NOT TOUCH
   data-mrn-tilt, data-mrn-magnetic and data-mrn-parallax all make js/marine.js
   write an inline transform on the element. An entrance is also a transform.
   Anything carrying one of those is left alone — the same rule
   index-motion.js applies in ownedByMarine(), kept deliberately identical so
   the two lists cannot drift.
   Hand-authored data-sg-in / data-sg-split in the markup always wins.

   FAILURE SAFETY
   Every hidden initial state is armed by html.sg-motion, which the <head> shim
   removes after 4s unless index-motion.js stamps data-sg-ready. If this file
   throws, index-motion.js never loads, or the observer never fires, nothing
   stays invisible. The choreographer is additionally wrapped in try/catch so a
   single bad selector cannot cost the page its scroll engine.

   ES5 only — no let/const/arrow/template string — same target as the rest of
   the site's scripts.
   ========================================================================== */
(function (win, doc) {
    'use strict';

    var html = doc.documentElement;
    if (!html || win.SGPageFX) return;

    /* index.html has its own hand-authored choreography. If this file is ever
       pulled in there by mistake, do nothing.
       The test is `.mrnp-section`, which every inner page is built from and
       index has none of. It deliberately is NOT `.mrn-hero`: about_us.html
       reuses index's cinematic hero component, and testing for that would
       switch this file off on the one page that needs it most. */
    if (!doc.querySelector('.mrnp-section')) return;

    /* ----------------------------------------------------------------------
       0. Helpers
    ---------------------------------------------------------------------- */

    function list(sel, root) {
        var out = [], n, i;
        try { n = (root || doc).querySelectorAll(sel); } catch (e) { return out; }
        for (i = 0; i < n.length; i++) out.push(n[i]);
        return out;
    }

    function hasClass(el, c) {
        return (' ' + (el.className || '') + ' ').indexOf(' ' + c + ' ') > -1;
    }

    function addClass(el, c) {
        if (!hasClass(el, c)) el.className += (el.className ? ' ' : '') + c;
    }

    /* identical to index-motion.js ownedByMarine() minus data-mrn-reveal,
       which is an entrance we are replacing rather than a behaviour we must
       not disturb */
    function blocked(el) {
        return el.hasAttribute('data-mrn-tilt') ||
            el.hasAttribute('data-mrn-magnetic') ||
            el.hasAttribute('data-mrn-parallax');
    }

    function authored(el) {
        return el.hasAttribute('data-sg-in') || el.hasAttribute('data-sg-split');
    }

    var MAX_DELAY = 10;   /* css/page-fx.css section 8 defines 7..10 */

    function stamp(el, dir, delay) {
        if (!el || el.__pfx || blocked(el) || authored(el)) return false;
        el.__pfx = 1;

        /* one entrance engine per element */
        el.removeAttribute('data-mrn-reveal');

        if (dir === 'split') el.setAttribute('data-sg-split', '');
        else el.setAttribute('data-sg-in', dir);

        if (delay > 0) {
            el.setAttribute('data-sg-delay', String(delay > MAX_DELAY ? MAX_DELAY : delay));
        }
        return true;
    }

    /* Hand the container's own entrance back once its children have their
       own. Immediate parent only — walking further up could strip a reveal
       from a wrapper that still owns things this file never looked at. */
    function releaseParent(el) {
        var p = el.parentNode;
        if (!p || p.nodeType !== 1) return;
        if (p.hasAttribute('data-mrn-stagger')) p.removeAttribute('data-mrn-stagger');
        if (p.hasAttribute('data-mrn-reveal') && !blocked(p)) p.removeAttribute('data-mrn-reveal');
    }

    /* ----------------------------------------------------------------------
       1. The table
       Read top to bottom. First rule to claim an element wins, because
       stamp() marks it __pfx and later rules skip it.

         sel    what to stamp
         dir    up | left | right | zoom | rise | tilt | sink | clip | split
         cols   > 1 makes it a SWEEP: delay = (index within the group % cols),
                so a 4-up grid lights left to right and the next row starts
                over rather than waiting a second and a half for its turn.
         base   delay added to every element the rule stamps
    ---------------------------------------------------------------------- */

    var RULES = [
        /* --- section headers ------------------------------------------- */
        { sel: '.mrn-eyebrow', dir: 'up' },
        { sel: '.mrn-title', dir: 'split' },

        /* --- body copy -------------------------------------------------- */
        { sel: '.mrnp-prose', dir: 'up', base: 1 },
        { sel: '.pfx-note', dir: 'up', base: 1 },

        /* --- the image half of a split ---------------------------------- */
        /* the FRAME, never .mrnp-split__media: marine.js's tilt resolves its
           target to the media element itself on these pages (there is no
           .mrn-figure__frame inside), so the media carries an inline
           transform and the frame is the free layer. */
        { sel: '.mrnp-split__frame', dir: 'clip' },
        { sel: '.mrnp-split__tag', dir: 'up', base: 3 },

        /* --- card grids -------------------------------------------------- */
        { sel: '.mrnp-grid--4 > .mrnp-icard', dir: 'rise', cols: 4 },
        { sel: '.mrnp-grid--3 > .mrnp-icard', dir: 'rise', cols: 3 },
        { sel: '.mrnp-grid--2 > .mrnp-icard', dir: 'rise', cols: 2 },
        { sel: '.mrnp-icard', dir: 'rise', cols: 3 },

        { sel: '.mrnp-certcard', dir: 'zoom', cols: 4 },
        { sel: '.mrnp-gal__item', dir: 'zoom', cols: 3 },
        { sel: '.mrnp-post', dir: 'rise', cols: 3 },
        { sel: '.mrnp-quote', dir: 'up', cols: 2 },
        { sel: '.mrnp-flip', dir: 'zoom', cols: 2 },

        /* --- lists and rails --------------------------------------------- */
        { sel: '.mrnp-checks li', dir: 'left', cols: 2 },
        { sel: '.mrnp-acc__item', dir: 'up', cols: 1, step: 1 },
        { sel: '.pfx-step', dir: 'left', cols: 1, step: 1 },

        /* the rail sweeps cell by cell — the plate itself is the ground and
           should already be there when the figures start counting */
        { sel: '.mrnp-strip > div', dir: 'up', cols: 4 },

        { sel: '.pfx-marquee', dir: 'up' },
        { sel: '.mrnp-section .table-responsive', dir: 'up' },

        /* --- about_us.html's own components (themed in index-theme.css) --- */
        /* .abt-unit and .abt-split__media both carry data-mrn-tilt, so they
           are marine's — only the untilted blocks are claimed here. */
        { sel: '.abt-time__item', dir: 'left', cols: 1, step: 1 },
        { sel: '.abt-comply li', dir: 'up', cols: 5 },

        /* --- contact ------------------------------------------------------ */
        { sel: '.mrnp-infocard', dir: 'left', cols: 1, step: 1 },
        { sel: '.mrnp-form', dir: 'right' },
        { sel: '.mrnp-map', dir: 'up', base: 1 },
        { sel: '.mrnp-pagenav', dir: 'left' },

        /* --- anything left over that is clearly a heading ------------------ */
        { sel: '.mrnp-section h2:not(.mrn-title)', dir: 'split' },
        { sel: '.mrnp-section h3:not(.mrn-title)', dir: 'up' }
    ];

    function choreograph() {
        var r, i, k, nodes, seq, dly;

        for (k = 0; k < RULES.length; k++) {
            r = RULES[k];
            nodes = list(r.sel);
            if (!nodes.length) continue;

            seq = 0;
            for (i = 0; i < nodes.length; i++) {
                if (nodes[i].__pfx || blocked(nodes[i]) || authored(nodes[i])) continue;

                if (r.cols > 1) dly = (seq % r.cols) + (r.base || 0);
                else if (r.step) dly = seq * r.step + (r.base || 0);
                else dly = (r.base || 0);

                if (stamp(nodes[i], r.dir, dly)) {
                    if (r.cols || r.step) releaseParent(nodes[i]);
                    seq++;
                }
            }
        }

        /* A grid whose children were all claimed still holds its own
           data-mrn-reveal when the rule that claimed them had no cols/step.
           Sweep those containers once, so nothing is left arming an empty
           entrance over content that has already animated. */
        var wraps = list('[data-mrn-stagger]');
        for (i = 0; i < wraps.length; i++) {
            if (wraps[i].querySelector('[data-sg-in], [data-sg-split]')) {
                wraps[i].removeAttribute('data-mrn-stagger');
                if (!blocked(wraps[i])) wraps[i].removeAttribute('data-mrn-reveal');
            }
        }
    }

    /* ----------------------------------------------------------------------
       2. Scrubbers — subscribe to the shared loop, own nothing else
    ---------------------------------------------------------------------- */

    /* 2.1 Hero.
       The photograph drifts against the scroll and the copy lifts and fades
       as the hero leaves — the two moves that separate a cinematic banner
       from a static one.

       Travel budget: marine-pages.css:26 overscans .mrnp-hero__bg by 8% of
       the hero height top and bottom, and css/page-fx.css keeps the static
       scale(1.06) on top of that. Taking 6% as the half-range leaves a
       quarter of the overhang as guard at every hero height, so an edge can
       never scroll into view. css/page-fx.css also sets `animation: none`
       there — a CSS animation on transform would beat this inline write. */
    function heroScrub(SG) {
        var hero = doc.querySelector('.mrnp-hero');
        if (!hero || SG.reduced) return;

        var bg = hero.querySelector('.mrnp-hero__bg');
        var inner = hero.querySelector('.mrnp-hero__inner');
        if (!bg && !inner) return;

        var travel = 0;
        var lastBg = null, lastInner = null;

        function remeasure() {
            var h = hero.offsetHeight || 0;
            travel = h * 0.06;
            if (travel > 52) travel = 52;
        }
        remeasure();
        SG.onResize(remeasure);

        SG.track(hero, function (p) {
            var y, o, s;

            if (bg) {
                y = (p - 0.5) * 2 * travel;
                s = Math.round(y * 10) / 10;
                if (s !== lastBg) {
                    lastBg = s;
                    bg.style.transform = 'translate3d(0,' + s + 'px,0) scale(1.06)';
                }
            }

            if (inner) {
                /* only once the hero is more than half gone, so the entrance
                   animations on the crumb, title and rule play untouched */
                o = p < 0.55 ? 0 : (p - 0.55) / 0.45;
                s = Math.round(o * 1000) / 1000;
                if (s !== lastInner) {
                    lastInner = s;
                    inner.style.transform = 'translate3d(0,' + (-s * 70).toFixed(1) + 'px,0)';
                    inner.style.opacity = String(1 - s * 0.82);
                }
            }
        });
    }

    /* 2.2 Section rail scrollspy.
       For .pfx-jump — the sticky in-page bar that replaced the About dropdown.
       js/marine-pages.js already ships a scrollspy but it is hard-bound to
       .mrnp-pagenav, the sidebar variant, so this is the horizontal one.

       It reads section tops once and re-reads on resize rather than every
       frame: SGMotion.onScroll fires on the shared loop, and doing layout
       reads inside it would cost the page a reflow per frame. */
    function railSpy(SG) {
        var rail = doc.querySelector('.pfx-jump');
        if (!rail) return;

        var links = list('a[href^="#"]', rail);
        if (!links.length) return;

        /* UNBLOCK position:sticky.
           .wrapper carries `overflow: hidden` (css/style.css), which makes it
           the sticky element's scrollport — and that box never scrolls, so the
           rail scrolled away with the page. Measured: its top ran to -1803px.
           `overflow-x: clip` clips exactly the same way WITHOUT establishing a
           scroll container, which is the whole difference. Verified on this
           page: the rail parks correctly and not one element starts
           overflowing horizontally that was not already clipped.
           The class is added here rather than in the markup so it can never
           outlive the rail, and css/page-fx.css guards it behind
           @supports — a browser without `clip` keeps `overflow: hidden` and
           simply does not get a sticky rail, rather than getting a stray
           vertical scrollbar from a half-applied pair. */
        var wrap = rail.parentNode;
        while (wrap && wrap.nodeType === 1 && !hasClass(wrap, 'wrapper')) wrap = wrap.parentNode;
        if (wrap && wrap.nodeType === 1) addClass(wrap, 'has-jump-rail');

        /* the bar the rail parks under is js/main.js's .sticky_menu header,
           which is a different height from the one in normal flow — so it can
           only be measured once it is actually sticky */
        var header = doc.querySelector('.header');
        var headMeasured = false;

        function syncTop() {
            if (headMeasured || !header) return;
            if (!hasClass(header, 'sticky_menu')) return;
            var h = Math.round(header.getBoundingClientRect().height);
            if (h < 30 || h > 200) return;
            headMeasured = true;
            rail.style.setProperty('--pfx-jump-top', h + 'px');
            remeasure();
        }

        var items = [], i, t;
        for (i = 0; i < links.length; i++) {
            t = doc.getElementById(links[i].getAttribute('href').slice(1));
            if (t) items.push({ a: links[i], el: t, top: 0 });
        }
        if (!items.length) return;

        var current = null;
        var offset = 0;

        function remeasure() {
            /* the rail parks itself under the site header, so a section counts
               as current once its top passes the underside of the rail */
            var railH = rail.getBoundingClientRect().height;

            /* marine.css:38 sets scroll-padding-top:96px for the sticky header
               alone. This page stacks the rail on top of it, so an anchor
               would land under the rail — including a cross-page one like the
               footer's about_us.html#vision. Restate it with the rail counted
               in. index-motion.js's padTop() reads this same property, so the
               animated in-page tween and the browser's own jump agree. */
            var parked = parseFloat(getComputedStyle(rail).top);
            if (isNaN(parked)) parked = 0;
            var pad = Math.round(parked + railH + 24);
            html.style.scrollPaddingTop = pad + 'px';

            /* The spy threshold is that same landing position plus a few px of
               tolerance — derived from it rather than guessed, so clicking a
               chip always lights the chip you clicked. A round number here
               left the previous section highlighted by ~5px. */
            offset = pad + 12;

            var y = SG.scrollY();
            for (var k = 0; k < items.length; k++) {
                items[k].top = items[k].el.getBoundingClientRect().top + y;
            }
        }

        function paint(y) {
            var found = items[0];
            for (var k = 0; k < items.length; k++) {
                if (items[k].top - offset <= y) found = items[k];
            }
            if (found === current) return;
            if (current) current.a.className = current.a.className
                .replace(/\s*is-active/g, '');
            current = found;
            if (found.a.className.indexOf('is-active') === -1) {
                found.a.className += (found.a.className ? ' ' : '') + 'is-active';
            }
            /* keep the active chip in view when the rail itself scrolls */
            if (rail.scrollWidth > rail.clientWidth) {
                var r = found.a.getBoundingClientRect(), rr = rail.getBoundingClientRect();
                if (r.left < rr.left + 12) rail.scrollLeft += r.left - rr.left - 24;
                else if (r.right > rr.right - 12) rail.scrollLeft += r.right - rr.right + 24;
            }
        }

        remeasure();
        paint(SG.scrollY());
        SG.onResize(function () { headMeasured = false; syncTop(); remeasure(); paint(SG.scrollY()); });
        SG.onScroll(function (y) { syncTop(); paint(y); });
        if (win.addEventListener) {
            win.addEventListener('load', function () { remeasure(); paint(SG.scrollY()); }, false);
        }
    }

    /* 2.3 Generic progress.
       Writes --pfx-p from 0..1 across the element's own travel through the
       viewport. css/page-fx.css uses it to fill the .pfx-steps spine. The
       range is squeezed to the middle 70% of the pass so the line is full
       before the last station leaves the screen, not after. */
    function progressScrub(SG) {
        var nodes = list('[data-pfx-progress]');
        if (!nodes.length) return;

        for (var i = 0; i < nodes.length; i++) {
            (function (el) {
                var last = -1;
                if (SG.reduced) { el.style.setProperty('--pfx-p', '1'); return; }
                SG.track(el, function (p) {
                    var v = (p - 0.15) / 0.55;
                    if (v < 0) v = 0; else if (v > 1) v = 1;
                    v = Math.round(v * 100) / 100;
                    if (v !== last) {
                        last = v;
                        el.style.setProperty('--pfx-p', String(v));
                    }
                });
            })(nodes[i]);
        }
    }

    /* ----------------------------------------------------------------------
       3. Boot
       Choreography runs NOW — this script sits at the end of <body>, so the
       whole document above it is parsed, and index-motion.js has not yet
       registered its DOMContentLoaded handler's work.
       The scrubbers wait for that handler to publish window.SGMotion. A
       setTimeout scheduled from inside a DOMContentLoaded listener runs after
       every DOMContentLoaded listener has finished, which is the ordering we
       need and is deterministic — no polling.
    ---------------------------------------------------------------------- */

    function runChoreography() {
        try { choreograph(); } catch (e) { /* never cost the page its engine */ }
    }

    function runScrubbers() {
        var SG = win.SGMotion;
        if (!SG || !SG.track) return;      /* index-motion.js absent — fine */
        try {
            heroScrub(SG);
            railSpy(SG);
            progressScrub(SG);
        } catch (e) { }
    }

    if (doc.body) {
        runChoreography();
    } else {
        doc.addEventListener('DOMContentLoaded', runChoreography, false);
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', function () {
            win.setTimeout(runScrubbers, 0);
        }, false);
    } else {
        win.setTimeout(runScrubbers, 0);
    }

    win.SGPageFX = { version: '1.0.0', rules: RULES.length };

})(window, document);
