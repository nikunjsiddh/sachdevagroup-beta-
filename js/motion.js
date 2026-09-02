/* ==========================================================================
   SACHDEVA GROUP — MOTION
   The single scroll-motion engine for index.html
   ==========================================================================
   Loads AFTER gsap + ScrollTrigger, and after js/main.js (which owns the one
   Lenis instance) — see the script block at the end of index.html.

   WHY THIS FILE EXISTS
     index.html was running four overlapping motion systems: js/sg-reveal.js
     (67 reveal elements + a 2.5s setInterval sweep), js/index-motion.js (its
     own rAF loop, scroll and resize listeners, and a parallax module),
     js/marine.js (three more raw scroll listeners, for the progress bar, the
     parallax layers and the timeline), and AOS (loaded, initialised, driving
     exactly zero elements). This is all of it, once.

   SCOPE — index.html ONLY
     js/marine.js and js/index-motion.js are shared with 12 inner pages that
     still depend on them: 70 [data-mrn-reveal], 25 [data-mrn-stagger],
     39 [data-sg-split] and 12 [data-sg-in] elements live on those pages, and
     js/page-fx.js rides window.SGMotion's shared loop. Nothing in those files
     is deleted. They read window.SG_MOTION_ENGINE at boot — set to 'gsap' by
     the shim in index.html's <head> — and stand down only the parts this file
     takes over. Every other page never sets the flag and is untouched.

   PUBLIC CONTRACT — unchanged from js/sg-reveal.js
     [data-anim="fade-up|fade-left|fade-right|clip-up"]  the reveal vocabulary
     [data-d="<seconds>"]        authored delay, wins over any cascade
     [data-stagger="<seconds>"]  on a parent, spaces its [data-anim] descendants
     .in then .settled           the state classes the CSS transitions off
     html.sg-anim                the gate: no class, nothing hidden, no JS needed
   The CSS half is untouched in css/index-theme.css lines 7628-7748.

   NO-JS / FAILED-CDN SAFETY
     html.sg-anim is set by the head shim and pulled again after 4s unless this
     file stamps html[data-mo-ready]. If GSAP 404s, this file returns at the
     first guard and drops the gate immediately. Content is never left hidden.

   ES5 syntax throughout, matching the rest of the site's JS.
   ========================================================================== */
(function (win, doc) {
    'use strict';

    var html = doc.documentElement;

    /* ------------------------------------------------------------------
       0. Guards and failsafes
    ------------------------------------------------------------------ */
    function dropGate() {
        if (html.classList) html.classList.remove('sg-anim');
        else html.className = (' ' + html.className + ' ').split(' sg-anim ').join(' ');
    }

    var gsap = win.gsap;
    var ST = win.ScrollTrigger;

    /* GSAP blocked, 404'd or still in flight: nothing may stay invisible. */
    if (!gsap || !ST) { dropGate(); return; }
    if (win.SGMotionGSAP) return;                       /* double-include */

    gsap.registerPlugin(ST);

    var qsa = function (sel, root) {
        return Array.prototype.slice.call((root || doc).querySelectorAll(sel));
    };
    var one = function (sel, root) { return (root || doc).querySelector(sel); };

    var EASE_OUT = 'power3.out';
    var EASE_SCRUB = 'none';
    var STAGGER = 0.085;
    var AUTO_CASCADE = 0.09;      /* js/sg-reveal.js's own auto step, kept */
    var HEAD = 75;                /* sticky header height, --mo-head */

    /* ------------------------------------------------------------------
       1. Lenis <-> GSAP
       js/main.js creates the instance and drives it from its own rAF loop.
       Two drivers would advance the eased scroll position twice per frame, so
       the flag retires that loop before the ticker takes over.
    ------------------------------------------------------------------ */
    var lenis = win.lenis || null;

    if (lenis) {
        win.__sgLenisExternal = true;                   /* main.js loop retires */
        lenis.on('scroll', ST.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);

        /* css/marine.css:37 sets html{scroll-behavior:smooth}. Native smooth
           scrolling and Lenis both animating the same scroll position fight
           each other on every anchor click. js/index-motion.js used to add
           this class; it stands down here, so this file must. */
        if (html.classList) html.classList.add('sg-scroll-auto');
    }

    ST.config({ ignoreMobileResize: true });
    ST.defaults({ invalidateOnRefresh: true });

    /* ------------------------------------------------------------------
       1b. Anchors — routed through Lenis so the 75px sticky header never
       covers the target. Delegated, so it also catches links added later.
    ------------------------------------------------------------------ */
    doc.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a || a.getAttribute('target')) return;
        var id = a.getAttribute('href');
        if (!id || id === '#' || id.charAt(0) !== '#') return;
        var target = doc.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -HEAD, duration: 1.1 });
        else target.scrollIntoView();
    }, false);

    /* Focusing something off-screen — keyboard tabbing — must bring it into
       view. Lenis owns the scroll position, so the browser's own scroll-into-
       view is suppressed and this has to be done explicitly. */
    doc.addEventListener('focusin', function (e) {
        if (!lenis) return;
        var t = e.target;
        if (!t || !t.getBoundingClientRect) return;
        var r = t.getBoundingClientRect();
        if (r.top >= HEAD + 15 && r.bottom <= (win.innerHeight || 0)) return;
        lenis.scrollTo(t, { offset: -(HEAD + 15), duration: .5 });
    }, true);

    /* The mobile menu is a scrollable overlay. js/index-motion.js used to park
       data-lenis-prevent on <body> while it was open; that file stands down, so
       this watches the same class js/main.js toggles. */
    (function watchMenu() {
        var menu = one('.slicknav_menu');
        if (!menu) { win.setTimeout(watchMenu, 400); return; }
        var nav = one('.slicknav_nav', menu);
        if (!nav || !win.MutationObserver) return;
        new win.MutationObserver(function () {
            var open = nav.className.indexOf('slicknav_hidden') === -1;
            if (open) { doc.body.setAttribute('data-lenis-prevent', ''); if (lenis) lenis.stop(); }
            else { doc.body.removeAttribute('data-lenis-prevent'); if (lenis) lenis.start(); }
            var hdr = one('.sgh-header');
            if (hdr && open && hdr.classList) hdr.classList.remove('is-hidden');
        }).observe(nav, { attributes: true, attributeFilter: ['class'] });
    })();

    /* ------------------------------------------------------------------
       2. will-change policy
       Added on enter, removed on leave. Never parked on a selector.
    ------------------------------------------------------------------ */
    function hint(el) {
        return {
            onEnter: function () { if (el.classList) el.classList.add('mo-active'); },
            onLeave: function () { if (el.classList) el.classList.remove('mo-active'); },
            onEnterBack: function () { if (el.classList) el.classList.add('mo-active'); },
            onLeaveBack: function () { if (el.classList) el.classList.remove('mo-active'); }
        };
    }

    /* ==================================================================
       3. PRIMITIVE 2 — the reveal port
       js/sg-reveal.js's behaviour, on ScrollTrigger.batch.
       ================================================================== */

    /* sg-reveal has a bug worth not reproducing. applyDelays() writes --d on
       every [data-stagger] child (line 53), and then revealBatch() overwrites
       --d for every element in the batch with data-d or i*0.09 (line 71) — so
       an authored data-stagger only survived when its children happened to
       enter the viewport in separate batches. Precedence here is the authored
       intent: data-d, then the element's position inside its data-stagger
       container, then the reading-order cascade. */
    var groups = [];

    /* Groups are keyed by element identity, held in a local array — NOT by a
       data-* attribute on the container. A matchMedia context re-runs every
       time the viewport crosses 1024px, and an attribute written on the first
       run is still there on the second while the lookup table is fresh, so the
       key resolves to nothing and the build throws. */
    function buildGroups() {
        var containers = [], byIndex = [];

        qsa('[data-anim]').forEach(function (el) {
            /* .parentElement.closest, not .closest: all six stagger containers
               carry data-anim themselves and must not become their own group */
            var sc = el.parentElement && el.parentElement.closest
                ? el.parentElement.closest('[data-stagger]') : null;
            var container = sc || el.closest('section, footer') || doc.body;

            var idx = containers.indexOf(container);
            if (idx === -1) {
                idx = containers.length;
                containers.push(container);
                byIndex.push({
                    container: container,
                    staggered: !!sc,
                    step: sc ? (parseFloat(sc.getAttribute('data-stagger')) || STAGGER) : STAGGER,
                    base: sc ? (parseFloat(sc.getAttribute('data-d')) || 0) : 0,
                    items: []
                });
            }
            byIndex[idx].items.push(el);
        });

        groups = byIndex;

        /* authored delays, resolved once */
        groups.forEach(function (g) {
            g.items.forEach(function (el, i) {
                var authored = el.getAttribute('data-d');
                if (authored !== null) { el.__moDelay = parseFloat(authored) || 0; return; }
                el.__moDelay = g.staggered ? +(g.base + i * g.step).toFixed(3) : null;
            });
        });
    }

    function readingOrder(a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return (ra.top - rb.top) || (ra.left - rb.left);
    }

    /* .settled zeroes --d once the reveal has landed, so a hover transition on
       the same element is instant instead of inheriting the stagger. Driven by
       transitionend with a timeout backstop — the longest reveal in the CSS is
       clip-up at 1.35s. */
    function settle(el, delaySec) {
        var done = false;
        function fin() {
            if (done) return;
            done = true;
            el.removeEventListener('transitionend', fin);
            if (el.classList) el.classList.add('settled');
            if (el.classList) el.classList.remove('mo-active');
        }
        el.addEventListener('transitionend', fin);
        win.setTimeout(fin, (delaySec * 1000) + 1600);
    }

    function revealBatch(els) {
        els = els.slice().sort(readingOrder);
        els.forEach(function (el, i) {
            if (el.classList && el.classList.contains('in')) return;
            var d = (typeof el.__moDelay === 'number' && el.__moDelay !== null)
                ? el.__moDelay
                : i * AUTO_CASCADE;
            el.style.setProperty('--d', d.toFixed(2) + 's');
            if (el.classList) { el.classList.add('mo-active'); el.classList.add('in'); }
            settle(el, d);
        });
    }

    function initReveals(reduced) {
        buildGroups();
        if (!groups.length) return;

        if (reduced) {
            /* CALM TIER — nothing may TRAVEL, but it does not follow that
               nothing may happen. This used to add .in and .settled to every
               element at load, so index.html arrived fully revealed for anyone
               with the preference set — and on Windows that is switched by
               "Show animations in Windows" and by the "Adjust for best
               performance" profile, neither of which is a statement about
               motion sensitivity.

               The reveal still runs on scroll; css/index-theme.css strips the
               transform under html.sg-calm so every direction collapses to a
               plain opacity fade. Parallax, scrubbing and Lenis stay off — the
               caller below still tears those down. */
            if (html.classList) html.classList.add('sg-calm');
            else html.className += ' sg-calm';

            groups.forEach(function (g) {
                ST.batch(g.items, {
                    start: 'top 88%',
                    once: true,
                    onEnter: revealBatch
                });
            });
            return;
        }

        groups.forEach(function (g) {
            ST.batch(g.items, {
                start: 'top 85%',
                once: true,
                onEnter: revealBatch
            });
        });
    }

    /* ==================================================================
       4. PRIMITIVE 1 — parallax tiers
       far  full-bleed backgrounds, plates, scrims
       mid  framed media, mosaics, card groups
       near headings, copy, CTAs — moves AGAINST the background
       ================================================================== */

    /* The tier amplitudes are expressed as the TOTAL travel, and applied
       centred (-amp/2 .. +amp/2) rather than 0..amp. One-directional drift on a
       layer that is only overscanned symmetrically would spend the whole budget
       on one edge and expose the other. */
    var TIER = {
        far: { prop: 'yPercent', amp: 18 },
        band: { prop: 'yPercent', amp: 18 },   /* alias — the value already in the markup */
        mid: { prop: 'y', amp: 80 },
        near: { prop: 'y', amp: -120 }
    };

    /* A `far` layer must never pull its own edge into frame. Rather than trust
       a CSS overscan to stay correct at every width, measure the real overhang
       and clamp. #journey .mrn-journey__plate is the reason: index-theme.css
       gives it a fixed +/-140px against a ~1700px section, which is under 9%. */
    function safeYPercent(layer, container, want) {
        var lr = layer.getBoundingClientRect();
        var cr = container.getBoundingClientRect();
        if (!lr.height) return 0;
        var over = Math.min(cr.top - lr.top, lr.bottom - cr.bottom);
        if (!(over > 0)) return 0;
        var maxPct = (over / lr.height) * 100 * 0.9;   /* 10% guard */
        return Math.min(want, maxPct);
    }

    function initParallax(scale) {
        qsa('[data-sg-parallax]').forEach(function (el) {
            var tier = TIER[el.getAttribute('data-sg-parallax')] || TIER.far;
            var container = el.closest('section, footer') || el.parentNode;
            var amp = tier.amp * scale;
            var vars = { ease: EASE_SCRUB, overwrite: 'auto' };
            var from = {};

            if (tier.prop === 'yPercent') {
                var half = amp / 2;
                var safe = safeYPercent(el, container, half);
                if (safe <= 0.2) return;                 /* no headroom: leave it still */
                from.yPercent = -safe;
                vars.yPercent = safe;
            } else {
                from.y = -amp / 2;
                vars.y = amp / 2;
            }

            vars.scrollTrigger = {
                trigger: container,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
                onRefresh: function (self) {
                    if (tier.prop !== 'yPercent') return;
                    var s = safeYPercent(el, container, (tier.amp * scale) / 2);
                    self.animation.invalidate();
                    gsap.set(el, { yPercent: -s });
                    self.animation.vars.yPercent = s;
                }
            };
            gsap.fromTo(el, from, vars);
        });
    }

    /* ==================================================================
       5. PRIMITIVE 3 — the contained-frame clip
       ================================================================== */
    function initFrames() {
        qsa('[data-sg-frame]').forEach(function (el) {
            var mode = el.getAttribute('data-sg-frame');
            var section = el.closest('section') || el;
            var media = one('img, video', el);

            if (mode === 'close') {
                /* full-bleed -> contained. The reference's signature move. */
                gsap.fromTo(el,
                    { clipPath: 'inset(0%)' },
                    {
                        clipPath: 'inset(8% 12% round 14px)',
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: section, start: 'top 50%', end: '+=70%', scrub: 1
                        }
                    });
            } else {
                /* contained -> full view */
                gsap.fromTo(el,
                    { clipPath: 'inset(12% 18% round 20px)' },
                    {
                        clipPath: 'inset(0% round 0px)',
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: el, start: 'top 88%', end: 'top 30%', scrub: 1
                        }
                    });
            }

            /* the media inside ALWAYS counter-moves — this is what sells it */
            if (media) {
                gsap.fromTo(media, { yPercent: -6 }, {
                    yPercent: 6, ease: EASE_SCRUB,
                    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
                });
            }
        });
    }

    /* ==================================================================
       6. SECTIONS — §5 of the spec, in page order
       Each returns nothing; all are registered inside a matchMedia context
       so GSAP reverts them cleanly when the query stops matching.
       ================================================================== */

    /* --- scroll chrome ------------------------------------------------- */
    function chrome() {
        var bar = doc.getElementById('mrnProgress');
        if (bar) {
            /* Driven from self.progress rather than a tween on a body trigger.
               `trigger: document.body` measured a start/end pair that never
               advanced here — the bar sat at scaleX(0) the whole way down the
               page — because body is the scroll container's own child under
               Lenis and its rect does not travel. start:0 / end:"max" asks
               ScrollTrigger for the document scroll range directly, which is
               what a page-progress bar actually wants. */
            gsap.set(bar, { scaleX: 0 });
            ST.create({
                start: 0, end: 'max', scrub: 0.3,
                onUpdate: function (self) {
                    gsap.set(bar, { scaleX: self.progress });
                }
            });
        }

        var header = one('.sgh-header');
        if (!header || !header.classList) return;

        /* Direction is tracked from the scroll position rather than read off
           self.direction. Under Lenis, a jump (an anchor tween, a scrollbar
           drag, restoring a scroll position) settles through a few frames whose
           reported direction is the direction of the *easing*, not of the
           user's intent — which left the header stuck off-screen after every
           upward jump. Measuring the delta is unambiguous.
           The 4px deadband stops sub-pixel easing jitter from flickering it. */
        var HIDE_AT = 400;
        var lastY = 0;

        ST.create({
            start: 0, end: 'max',
            onUpdate: function (self) {
                var y = self.scroll();
                header.classList.toggle('is-stuck', y > 80);

                var dy = y - lastY;
                if (Math.abs(dy) > 4) {
                    lastY = y;
                    /* never hide a header the open mobile menu is anchored to */
                    var menuOpen = doc.body.hasAttribute('data-lenis-prevent');
                    header.classList.toggle('is-hidden', !menuOpen && dy > 0 && y > HIDE_AT);
                }
                if (y <= HIDE_AT) header.classList.remove('is-hidden');
            }
        });
    }

    /* --- #home --------------------------------------------------------- */
    function hero(scale) {
        var sec = doc.getElementById('home');
        if (!sec) return;

        var rays = one('.mrn-hero__rays', sec);
        var canvas = one('#mrnHeroCanvas', sec);
        var inner = one('.mrn-hero__inner', sec);
        var scrim = one('.mrn-hero__scrim', sec);
        var cue = one('.mrn-scrollcue', sec);
        var rail = one('.mrn-hero__rail', sec);

        var band = { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true };

        /* the rays drift FASTER than the footage — that difference is the
           depth cue, not the movement itself */
        if (rays) gsap.fromTo(rays, { yPercent: -13 * scale }, { yPercent: 13 * scale, ease: EASE_SCRUB, scrollTrigger: band });
        if (canvas) gsap.fromTo(canvas, { yPercent: -5 * scale }, { yPercent: 5 * scale, ease: EASE_SCRUB, scrollTrigger: band });

        if (inner) {
            gsap.fromTo(inner, { y: 0 }, {
                y: -120 * scale, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true }
            });
            gsap.to(inner, {
                opacity: 0.1, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom 40%', scrub: true }
            });
        }

        /* the headline has to stay legible while the footage drifts under it */
        if (scrim) {
            gsap.fromTo(scrim, { opacity: .55 }, {
                opacity: .85, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true }
            });
        }

        if (cue) {
            gsap.to(cue, {
                opacity: 0, y: 14, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top top', end: '+=18%', scrub: true }
            });
        }
        if (rail) {
            gsap.fromTo(rail, { y: 0 }, {
                y: -40 * scale, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true }
            });
        }

        /* Entrance. The title is NOT split at runtime: index.html already ships
           it as four .mrn-word masks with per-word spans, and
           js/index-motion.js's own splitter explicitly declines any element
           that already contains .mrn-word ("hero type owns itself"). Driving
           the spans that are already there is both the spec's effect and the
           markup's intent — so the CSS keyframe animation is switched off and
           GSAP takes the same elements. */
        var words = qsa('.mrn-hero__title .mrn-word > span', sec);
        var tl = gsap.timeline({ delay: 0.15 });

        if (words.length) {
            words.forEach(function (w) { w.style.animation = 'none'; });
            tl.fromTo(words,
                { yPercent: 110 },
                { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.09 }, 0);
        }
        var badge = one('.mrn-hero__badge', sec);
        var sub = one('.mrn-hero__sub', sec);
        var actions = one('.mrn-hero__actions', sec);
        /* badge and sub carry data-anim and are already handled by the reveal
           engine; the actions row is not, so it is brought in here to close the
           sequence inside the 1.6s budget */
        if (actions) tl.from(actions, { y: 24, opacity: 0, duration: .7, ease: EASE_OUT }, 0.62);

        /* the hero video is the heaviest thing on the page — stop decoding it
           the moment it is not on screen */
        var video = one('.mrn-hero__media video', sec);
        if (video) {
            ST.create({
                trigger: sec, start: 'top bottom', end: 'bottom top',
                onToggle: function (self) {
                    if (self.isActive) { var p = video.play(); if (p && p.catch) p.catch(function () { }); }
                    else video.pause();
                }
            });
        }
    }

    /* --- #about -------------------------------------------------------- */
    function about(scale) {
        var sec = doc.getElementById('about');
        if (!sec) return;

        var wave = one('.mrn-wavesep--top', sec);
        if (wave) {
            gsap.fromTo(wave, { yPercent: -4 * scale }, {
                yPercent: 4 * scale, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top center', scrub: true }
            });
        }

        var ring = one('.mrn-figure__ring', sec);
        if (ring) {
            gsap.fromTo(ring, { rotate: 0, scale: .96 }, {
                rotate: 8, scale: 1, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        }

        /* the copy column counter-moves against the figure */
        var copy = one('.mrn-about__grid > div:last-child', sec);
        if (copy) {
            gsap.fromTo(copy, { y: 30 * scale }, {
                y: -30 * scale, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        }
    }

    /* --- counters ------------------------------------------------------
       js/marine.js stands its own IntersectionObserver down on this page, so
       every [data-count] has to be started from here — not just the four in
       .mrn-stats. There are eleven: four in the hero rail, four in the stats
       band, and three more further down. Missing the other seven left them
       reading "0" for the life of the page.

       They are grouped by the row they sit in so a row counts as one movement
       rather than each figure tripping its own threshold, and each group gets
       ONE trigger. MRN.startCount is idempotent, so a re-run after a viewport
       change cannot restart a number that has already counted.
    ------------------------------------------------------------------ */
    function counters() {
        var nums = qsa('[data-count]');
        if (!nums.length || !win.MRN || !win.MRN.startCount) return;

        var rows = [], byRow = [];
        nums.forEach(function (n) {
            var row = n.closest('.mrn-hero__rail-grid, .mrn-stats__grid, .mrn-unit__meta')
                || n.closest('section, footer') || doc.body;
            var i = rows.indexOf(row);
            if (i === -1) { i = rows.length; rows.push(row); byRow.push([]); }
            byRow[i].push(n);
        });

        rows.forEach(function (row, i) {
            var group = byRow[i];
            ST.create({
                trigger: row, start: 'top 88%', once: true,
                onEnter: function () {
                    group.forEach(function (n) { win.MRN.startCount(n); });
                }
            });
        });
    }

    /* --- #companies ---------------------------------------------------- */
    function companies(scale, full) {
        var sec = doc.getElementById('companies');
        if (!sec) return;
        var stage = one('.mrn-units.d3-stage', sec);
        if (stage) {
            gsap.fromTo(stage, { y: 35 * scale }, {
                y: -35 * scale, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
            });
            if (full) {
                gsap.set(stage, { perspective: 1200 });
                ST.batch(qsa('.mrn-unit', stage), {
                    start: 'top 85%', once: true,
                    onEnter: function (els) {
                        gsap.from(els, {
                            y: 56, opacity: 0, rotateX: 7, transformOrigin: '50% 100%',
                            duration: .95, ease: EASE_OUT, stagger: 0.12, clearProps: 'transform,opacity'
                        });
                    }
                });
            }
        }
    }

    /* --- #process ------------------------------------------------------
       This section carries a live bug, not just a missing flourish.
       css/index-theme.css sets `#process .mrn-step__dot`, `.mrn-step h4` and
       `.mrn-step p` to opacity:0 and lifts them again only under
       `#process .mrn-flow.mrn-in`. `.mrn-in` is added by js/marine.js for
       [data-mrn-reveal] elements — and index.html has zero of those, so the
       class never arrived and the four step icons, headings and paragraphs
       have been invisible to every visitor whose OS is not set to reduce
       motion (the reduced-motion block at index-theme.css 3560+ sets them back
       to opacity:1, which is why it never showed up in testing on a machine
       with that preference on).
       Adding the class the CSS is already waiting for both fixes the bug and
       is exactly the choreography §5 asks for.
    ------------------------------------------------------------------ */
    function process() {
        var flow = one('#process .mrn-flow');
        if (!flow) return;
        var steps = qsa('.mrn-step', flow);
        var step = parseFloat(flow.getAttribute('data-stagger')) || 0.12;

        steps.forEach(function (el, i) {
            el.style.setProperty('--mrn-delay', Math.round(i * step * 1000) + 'ms');
        });

        ST.create({
            trigger: flow, start: 'top 85%', once: true,
            onEnter: function () { if (flow.classList) flow.classList.add('mrn-in'); }
        });
    }

    /* --- #journey ------------------------------------------------------ */
    function journey() {
        var list = doc.getElementById('mrnTimeline');
        var line = doc.getElementById('mrnTimelineProgress');
        if (!list || !line) return;

        /* clip, not scaleY: scaling would compress the cyan gradient into the
           first few pixels and grow the glow blur as the line advanced */
        gsap.fromTo(line,
            { clipPath: 'inset(0 0 100% 0)' },
            {
                clipPath: 'inset(0 0 0% 0)', ease: EASE_SCRUB,
                scrollTrigger: {
                    trigger: list, start: 'top 70%', end: 'bottom 70%', scrub: 0.5
                }
            });

        /* each dot lights as the line reaches it */
        qsa('.mrn-tl', list).forEach(function (li) {
            var dot = one('.mrn-tl__dot', li);
            if (!dot) return;
            gsap.fromTo(dot, { scale: 0 }, {
                scale: 1, ease: 'back.out(1.7)', duration: .5,
                scrollTrigger: { trigger: li, start: 'top 68%', once: true }
            });
        });
    }

    /* --- #commitment --------------------------------------------------- */
    /* .mrn-card ×3 reveal through their data-anim; .mrn-card__img keep
       data-anim="clip-up" and are deliberately NOT converted to sg-frame. */

    /* --- #credentials — velocity-linked marquee ------------------------ */
    function credentials(full) {
        /* HANDED OVER. js/cert-viewer.js drives this band now, with native
           scrollLeft rather than an xPercent tween, so that the auto-scroll,
           the touch swipe, the trackpad and the keyboard are all the same
           property — and so that the band still moves under
           prefers-reduced-motion, which never reaches this function at all
           (the reduce matchMedia context below calls a different, shorter
           branch than run(), so on a reduce-motion machine the track was
           never even duplicated).

           That file stamps the flag in its <head>-time IIFE, which is before
           GSAP exists, so this check is safe at any point in the boot.
           Returning null is expected by the caller: run() hands the value
           straight to mm.add's cleanup, which null-checks it. */
        if (doc.documentElement.getAttribute('data-sg-certs') === 'own') return null;

        var track = one('#credentials .mrn-certs__track');
        if (!track) return null;

        /* the CSS animation is only switched off once GSAP is definitely
           driving this — if this file never ran, the marquee still turns */
        track.style.animation = 'none';

        if (!full) { track.style.animation = ''; return null; }

        /* the -50% loop needs the track duplicated. js/marine.js does this for
           [data-mrn-marquee], but it stands down for this element on this page,
           so it is done here — once. */
        if (!track.getAttribute('data-mo-doubled')) {
            track.innerHTML += track.innerHTML;
            track.setAttribute('data-mo-doubled', '1');
        }

        var tl = gsap.to(track, {
            xPercent: -50, repeat: -1, ease: 'none', duration: 28
        });

        var restore = null;
        ST.create({
            trigger: '#credentials', start: 'top bottom', end: 'bottom top',
            onToggle: function (self) { self.isActive ? tl.play() : tl.pause(); },
            onUpdate: function (self) {
                var v = Math.abs(self.getVelocity()) / 900;
                tl.timeScale((self.direction === -1 ? -1 : 1) * (1 + Math.min(v, 3)));
                if (restore) restore.kill();
                restore = gsap.delayedCall(.6, function () {
                    gsap.to(tl, { timeScale: 1, duration: .6, overwrite: true });
                });
            }
        });

        var wrap = one('#credentials .mrn-certs') || track.parentNode;
        function pause() { tl.pause(); }
        function play() { tl.play(); }
        wrap.addEventListener('mouseenter', pause);
        wrap.addEventListener('mouseleave', play);
        wrap.addEventListener('focusin', pause);
        wrap.addEventListener('focusout', play);

        return function cleanup() {
            tl.kill();
            if (restore) restore.kill();
            wrap.removeEventListener('mouseenter', pause);
            wrap.removeEventListener('mouseleave', play);
            wrap.removeEventListener('focusin', pause);
            wrap.removeEventListener('focusout', play);
            track.style.animation = '';
        };
    }

    /* --- #yard --------------------------------------------------------- */
    function yard(scale) {
        var sec = doc.getElementById('yard');
        if (!sec) return;

        var rule = one('.mrn-mosaic__rule', sec);
        if (rule) {
            gsap.fromTo(rule, { scaleX: 0 }, {
                scaleX: 1, transformOrigin: '0 50%', duration: 1.1, ease: EASE_OUT,
                scrollTrigger: { trigger: rule, start: 'top 88%', once: true }
            });
        }

        /* the tiles' own images drift while the mosaic passes */
        qsa('.mrn-tile img', sec).forEach(function (img) {
            if (img.closest('[data-sg-frame]')) return;   /* that one is Primitive 3's */
            gsap.fromTo(img, { scale: 1.14 }, {
                scale: 1, ease: EASE_SCRUB,
                scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });
    }

    /* --- #contact ------------------------------------------------------ */
    /* .mrn-cta__bg is data-sg-parallax="band" (far). The two orbs are migrated
       in the markup to mid and near so they drift APART — they used to share a
       direction, which is what made the band read flat. Both handled by
       initParallax(). */

    /* --- #yard-address ------------------------------------------------- */
    function yardAddress(scale) {
        var glow = one('#yard-address .sgf-yard__glow');
        if (!glow) return;
        gsap.fromTo(glow, { opacity: 0, scale: .85 }, {
            opacity: 1, scale: 1, ease: EASE_SCRUB,
            scrollTrigger: { trigger: '#yard-address', start: 'top bottom', end: 'center center', scrub: true }
        });
    }

    /* --- footer -------------------------------------------------------- */
    function footer(scale) {
        var f = one('footer.sgf-footer');
        if (!f) return;
        var wave = one('.sgf-footer__wave', f);
        var inner = one('.sgf-footer__inner', f);
        var band = { trigger: f, start: 'top bottom', end: 'bottom bottom', scrub: true };
        if (wave) gsap.fromTo(wave, { yPercent: -5 * scale }, { yPercent: 5 * scale, ease: EASE_SCRUB, scrollTrigger: band });
        if (inner) gsap.fromTo(inner, { y: 50 * scale }, { y: -50 * scale, ease: EASE_SCRUB, scrollTrigger: band });
    }

    /* ==================================================================
       7. RESPONSIVE + REDUCED MOTION
       ================================================================== */
    var mm = gsap.matchMedia();

    /* full spec — desktop */
    mm.add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', function () {
        var cleanup = run(1, true);
        return function () { if (cleanup) cleanup(); };
    });

    /* tablet and phone — amplitudes at 0.45, no 3D settle, frames fade
       instead of scrubbing a clip */
    mm.add('(max-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
        var cleanup = run(0.45, false);
        return function () { if (cleanup) cleanup(); };
    });

    /* reduced motion — reveals resolve instantly, nothing scrubs, nothing
       drifts, and Lenis hands the scroll position back to the browser */
    mm.add('(prefers-reduced-motion: reduce)', function () {
        initReveals(true);
        chrome();
        counters();
        if (one('#process .mrn-flow') && one('#process .mrn-flow').classList) {
            one('#process .mrn-flow').classList.add('mrn-in');
        }
        if (lenis) { lenis.destroy(); win.__sgLenisExternal = false; }
        return function () { };
    });

    function run(scale, full) {
        initReveals(false);
        initParallax(scale);
        initFrames();
        chrome();
        hero(scale);
        about(scale);
        counters();
        companies(scale, full);
        process();
        journey();
        var certsCleanup = credentials(true);
        yard(scale);
        yardAddress(scale);
        footer(scale);
        return certsCleanup;
    }

    /* ==================================================================
       8. REFRESH DISCIPLINE
       Stale start/end positions are the number one cause of triggers firing
       at the wrong scroll point on a page like this one.
       ================================================================== */
    if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) {
        doc.fonts.ready.then(function () { ST.refresh(); });
    }
    win.addEventListener('load', function () { ST.refresh(); }, false);

    var heroVideo = one('.mrn-hero__media video');
    if (heroVideo) {
        heroVideo.addEventListener('loadedmetadata', function () { ST.refresh(); }, false);
    }

    var rt = null;
    win.addEventListener('resize', function () {
        win.clearTimeout(rt);
        rt = win.setTimeout(function () { ST.refresh(); }, 200);
    }, { passive: true });

    /* we made it — stand the head shim's failsafe down */
    html.setAttribute('data-mo-ready', '1');

    win.SGMotionGSAP = {
        version: '1.0.0',
        lenis: lenis,
        refresh: function () { ST.refresh(); },
        triggers: function () { return ST.getAll().length; }
    };

})(window, document);
