/* ==========================================================================
   SACHDEVA GROUP — SCROLL FX
   The cinematic layer: hero curtain, masked line reveals, photographs that
   open as they scroll in, the footer that slides out from under the page,
   and the header that steps aside while you read.
   ==========================================================================
   Load order : after js/scroll-drift.js, which is after every reveal engine.
   Requires   : GSAP 3.13 + ScrollTrigger + SplitText (all free since 3.13).
   Pages      : all 13. index.html takes only the footer part — js/motion.js
                already owns its sections, its hero and its header hide.

   WHAT WAS MEASURED (studiodado.com, wp-content/themes/studio-dado/dist/app.js)
     lines    SplitText lines inside overflow:clip masks, from y:110%,
              stagger .1, on scroll (once)
     open     scrub top-bottom → bottom-bottom: the box clipPath inset(10%)
              → 0 while .media scales 1.1 → 1; then img yPercent -20 → 20
              across the rest of the travel (js/scroll-drift.js has that half)
     intro    a full-viewport curtain clipPath inset(0 0 100%) over 2s
              expo.inOut; hero media yPercent 35 / scale 1.1 → 0 / 1 in 2s;
              copy from y:80 autoAlpha:0, stagger .1
     footer   fromTo y:-h/4 → 0 as the last section leaves
     header   translateY(-100%) scrolling down, back on scrolling up

   OWNERSHIP — THE PRE-PASS
     This script runs at parse time, AFTER js/page-fx.js has stamped its
     data-sg-* choreography and BEFORE js/marine.js / js/marine-pages.js /
     js/index-motion.js boot on DOMContentLoaded. The pre-pass claims every
     element it animates by stripping the other engines' attributes off it,
     synchronously, in the same task that arms it — so nothing is animated
     twice and nothing flashes. A box that opens also releases the reveal on
     its ancestors up to the section, so a photograph never slides in AND
     opens. Hand-marked hero type (.mrn-word) and the drop-cap lead
     paragraph are left alone.

   NO-JS / FAILED-CDN
     Two things are hidden by CSS ahead of time, both behind gates:
       html.sfx-arm    the load curtain — set by js/motion-policy.js only on
                       arrivals at pages with <html data-sfx-intro>
       html.sfx-lines  the line-reveal targets — set by the pre-pass below,
                       only once GSAP and SplitText are known to be present
     motion-policy pulls both after 2.5s unless this file stamps
     html[data-sfx-ready]; this file's own catch block pulls them if anything
     throws; and if the failsafe has already fired by the time boot() runs,
     the lines are simply left as they are rather than hidden and replayed.
     Everything else starts visible and is only ever transformed.
   ========================================================================== */
(function (win, doc) {
    'use strict';

    var html = doc.documentElement;
    var gsap = win.gsap;
    var ST = win.ScrollTrigger;
    var Split = win.SplitText;

    function hasC(el, c) { return (' ' + el.className + ' ').indexOf(' ' + c + ' ') > -1; }
    function addC(el, c) { if (!hasC(el, c)) el.className += (el.className ? ' ' : '') + c; }
    function delC(el, c) {
        el.className = (' ' + el.className + ' ').split(' ' + c + ' ').join(' ').replace(/^\s+|\s+$/g, '');
    }
    function list(sel, root) {
        try { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
        catch (e) { return []; }
    }
    function standDown() { delC(html, 'sfx-arm'); delC(html, 'sfx-lines'); }

    if (win.SGScrollFX) return;
    if (!gsap || !ST) { standDown(); return; }
    if (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) { standDown(); return; }

    gsap.registerPlugin(ST);
    if (Split) gsap.registerPlugin(Split);

    var EASE_OUT = 'expo.out';
    var isIndex = !doc.querySelector('.mrnp-section');
    var hero = doc.querySelector('.mrnp-hero');
    /* whether js/motion-policy.js drew the curtain for this page view — read
       now, because buildIntro() drops the class once the curtain is gone */
    var ARMED = hasC(html, 'sfx-arm');
    var lineEls = [];
    var openEls = [];

    /* ----------------------------------------------------------------------
       1. PRE-PASS — synchronous, at parse time
       ---------------------------------------------------------------------- */
    var FOREIGN = ['data-sg-split', 'data-sg-in', 'data-sg-delay', 'data-mrn-reveal',
        'data-mrnp-split-words', 'data-anim'];

    function claim(el) {
        for (var i = 0; i < FOREIGN.length; i++) el.removeAttribute(FOREIGN[i]);
    }

    /* the reveal js/marine.js would have played on a wrapper — the tilted
       .mrnp-split__media, a card grid — is released, so the box inside is the
       only thing that moves */
    function releaseAncestors(el) {
        var p = el.parentNode;
        while (p && p.nodeType === 1 && p !== doc.body) {
            if (p.hasAttribute('data-mrn-reveal')) p.removeAttribute('data-mrn-reveal');
            if (p.hasAttribute('data-mrn-stagger')) p.removeAttribute('data-mrn-stagger');
            if (hasC(p, 'mrnp-section') || hasC(p, 'mrn-section')) break;
            p = p.parentNode;
        }
    }

    try {
        if (!isIndex && Split) {
            list('[data-sg-split], .mrnp-hero__title, .mrn-eyebrow, .mrn-lead').forEach(function (el) {
                if (el.__sfx) return;
                if (el.querySelector('.mrn-word') || hasC(el, 'mrnp-prose--lead')) return;
                el.__sfx = 1;
                claim(el);
                el.setAttribute('data-sfx-lines', '');
                lineEls.push(el);
            });
            if (lineEls.length) addC(html, 'sfx-lines');
        }
        list('[data-sfx-open]').forEach(function (el) {
            claim(el);
            releaseAncestors(el);
            openEls.push(el);
        });
    } catch (e) { standDown(); }

    /* ----------------------------------------------------------------------
       2. LINES — the reference's data-animate-text
       Each visual line sits in its own overflow:clip mask and rises from
       110% of its height. Hero copy plays on load, after the curtain when
       there is one; everything else plays once, when its top passes 88% of
       the viewport. A title that follows an eyebrow waits a beat for it, so
       a section always arrives top-down.
       autoSplit re-splits when the width changes or a font lands, and
       onSplit hands the tween back so SplitText can revert and rebuild it.
       ---------------------------------------------------------------------- */
    function inHero(el) { return !!(hero && hero.contains(el)); }

    function buildLines(el) {
        var heroEl = inHero(el);
        var isTitle = hasC(el, 'mrnp-hero__title');
        var isEyebrow = hasC(el, 'mrn-eyebrow');
        var prev = el.previousElementSibling;
        var afterEyebrow = !!(prev && hasC(prev, 'mrn-eyebrow'));

        Split.create(el, {
            type: 'lines',
            mask: 'lines',
            linesClass: 'sfx-line',
            autoSplit: true,
            onSplit: function (self) {
                var i;
                if (self.masks) for (i = 0; i < self.masks.length; i++) addC(self.masks[i], 'sfx-mask');
                addC(el, 'sfx-split');            /* box visible, lines still armed */

                /* autoSplit re-runs this when a font lands or the width
                   changes; an entrance that has already played must not
                   play again — the new lines simply sit where the old ones
                   finished */
                if (el.__sfxDone) return gsap.set(self.lines, { yPercent: 0 });

                var vars = {
                    yPercent: 110,
                    duration: isEyebrow ? 0.9 : 1.2,
                    ease: EASE_OUT,
                    stagger: 0.09,
                    immediateRender: true,
                    onComplete: function () { el.__sfxDone = true; }
                };
                if (heroEl) {
                    /* under a curtain the copy rises as the sheet clears it;
                       without one it simply rises straight away */
                    vars.delay = ARMED ? (isTitle ? 0.75 : 1.0) : (isTitle ? 0.1 : 0.4);
                    vars.duration = 1.5;
                } else {
                    vars.delay = afterEyebrow ? 0.14 : 0;
                    vars.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
                }
                return gsap.from(self.lines, vars);
            }
        });
    }

    /* ----------------------------------------------------------------------
       3. OPEN — the reference's .js-full-media
       The box opens from a 14% / 10% inset to full while its top travels
       from the bottom of the viewport to a third of the way up; the
       photograph inside settles from 1.14 to 1 over the same travel through
       --sfx-io, which css/scroll-fx.css multiplies into the image transform
       next to the hover zoom and the parallax. Once fully open the inline
       clip is removed altogether, so the box-shadow that sits outside the
       border box comes back; scrolling back up re-applies it on the next
       scrub write.
       ---------------------------------------------------------------------- */
    function buildOpen(el) {
        gsap.timeline({
            scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: function () { return el.offsetHeight < 320 ? 'top 55%' : 'top 35%'; },
                scrub: true,
                invalidateOnRefresh: true,
                onUpdate: function (self) {
                    var done = self.progress >= 0.999;
                    if (done === el.__sfxOpen) return;
                    el.__sfxOpen = done;
                    if (done) { el.style.clipPath = ''; el.style.webkitClipPath = ''; }
                }
            }
        })
            .fromTo(el,
                { clipPath: 'inset(14% 10% 14% 10%)' },
                { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
            .fromTo(el,
                { '--sfx-io': 1.14 },
                { '--sfx-io': 1, ease: 'power1.out' }, 0);
    }

    /* ----------------------------------------------------------------------
       4. INTRO — curtain up, photograph settles, copy rises
       The curtain is body::before, drawn by css/scroll-fx.css while
       html.sfx-arm is set; a pseudo-element cannot be tweened, so the bottom
       inset rides --sfx-curtain on <body>. The gate comes off the moment the
       curtain is gone so the pseudo stops painting.
       The hero photograph is written by js/page-fx.js heroScrub() on scroll
       and by js/marine-pages.js on pointer move; both keep the resting
       scale(1.06) this tween settles to, and clearProps hands the element
       back to the stylesheet when it is done. The layer is overscanned 8%
       and scaled 1.22 at the start, so a 12% rise never shows its edge.
       ---------------------------------------------------------------------- */
    function stillImage(el) {
        try { return getComputedStyle(el).animationName === 'none'; } catch (e) { return true; }
    }

    function buildIntro() {
        var armed = hasC(html, 'sfx-arm');
        if (!armed && !hero) return;

        var tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
        var t0 = armed ? 0.15 : 0;

        if (armed) {
            tl.fromTo(doc.body,
                { '--sfx-curtain': '0%' },
                { '--sfx-curtain': '100%', duration: 1.2, ease: 'expo.inOut' }, 0.08);
            tl.add(function () { delC(html, 'sfx-arm'); }, 1.3);
        }

        if (hero) {
            var bg = hero.querySelector('.mrnp-hero__bg');
            var crumb = hero.querySelector('.mrnp-crumb');
            var cue = hero.querySelector('.pfx-cue');

            if (bg) {
                tl.fromTo(bg,
                    { scale: 1.22, yPercent: 12 },
                    { scale: 1.06, yPercent: 0, duration: 2, ease: EASE_OUT, clearProps: 'transform' }, t0);
            }
            if (crumb && stillImage(crumb)) tl.from(crumb, { y: 24, autoAlpha: 0, duration: 1 }, t0 + 0.4);
            if (cue && stillImage(cue)) tl.from(cue, { autoAlpha: 0, duration: 1.2 }, t0 + 1.1);
        }
        return tl;
    }

    /* ----------------------------------------------------------------------
       5. FOOTER — slides out from under the yard band
       .sgf-yard paints white at z-index 2; css/scroll-fx.css drops the footer
       to z-index 1 once it carries .sfx-footer, so the distance it starts
       lifted by is hidden BEHIND the band, not above it.

       THE LIFT HAS TO BE BOUNDED BY THE BAND, NOT BY THE FOOTER
         The original figure was a flat 30% of the footer's own height. That
         reads fine on a desktop, where the footer is around 560px tall and
         the yard band is 330px: a 168px lift tucks neatly behind it.

         It inverts on a phone. The footer's four columns stack, so it grows
         to roughly 1500px while the yard band SHRINKS to about 480px. 30% is
         then a 450px lift — very nearly the whole band — so the footer rides
         up over the yard address card instead of behind it, and
         .sgf-footer__wave, which lives at the footer's top edge, spends the
         entire scroll parked behind .sgf-yard's white background where it is
         never seen. The wave only resolves at the very last pixel of the
         page, by which point nobody is looking at it. That is the "footer
         wave is a mess" report, and it is on all 13 pages.

         So the lift is measured against the thing doing the hiding. It can
         never exceed 55% of the preceding band, is capped at 170px outright,
         and is skipped below 861px — the same breakpoint buildHeader uses,
         and the point where the footer's stacked layout makes any lift more
         intrusive than it is worth.
       ---------------------------------------------------------------------- */
    var FOOTER_LIFT_MAX = 170;   /* px — never more than this, at any size   */
    var FOOTER_LIFT_BAND = 0.55; /* of the band above, which does the hiding */
    var FOOTER_LIFT_SELF = 0.3;  /* of the footer, the original figure       */

    function footerLift(footer) {
        var band = footer.previousElementSibling;
        var bandH = band ? band.offsetHeight : 0;
        var lift = footer.offsetHeight * FOOTER_LIFT_SELF;
        if (bandH) lift = Math.min(lift, bandH * FOOTER_LIFT_BAND);
        return Math.round(Math.min(lift, FOOTER_LIFT_MAX));
    }

    function buildFooter() {
        var footer = doc.querySelector('.sgf-footer');
        if (!footer) return;
        addC(footer, 'sfx-footer');
        gsap.fromTo(footer,
            { y: function () { return -footerLift(footer); } },
            {
                y: 0, ease: 'none',
                scrollTrigger: {
                    trigger: footer, start: 'top bottom', end: 'bottom bottom',
                    scrub: true, invalidateOnRefresh: true
                }
            });
        /* matchMedia reverts the tween on its own; the class is ours to undo,
           and a footer left at z-index 1 with nothing lifting it would sit
           under .sgf-yard for no reason. */
        return function () { delC(footer, 'sfx-footer'); };
    }

    /* ----------------------------------------------------------------------
       6. HEADER — out of the way while reading, back the moment you look up
       js/main.js makes the bar sticky past 80px with animate.css's
       fadeInDown. The first time the bar has to hide, that animation is
       dropped for good (its fill-mode would otherwise pin the transform), and
       from then on both moves are one transition on transform — a slide up,
       a slide back down — driven by .sfx-head-hide. Desktop only; the phone
       bar is the menu. Not on index.html, whose bar js/motion.js already
       hides with .is-hidden.
       ---------------------------------------------------------------------- */
    function buildHeader() {
        var header = doc.querySelector('.header');
        if (!header || isIndex) return;
        var hidden = false;
        var THRESH = 80;      /* = js/main.js stickyThreshold, so the bar never
                                 slides in only to slide straight back out */
        ST.create({
            start: 0,
            end: 'max',
            onUpdate: function (self) {
                var want = self.direction === 1 && self.scroll() > THRESH;
                if (want === hidden) return;
                hidden = want;
                if (want) {
                    addC(header, 'sfx-head');
                    delC(header, 'animated');
                    delC(header, 'fadeInDown');
                    addC(header, 'sfx-head-hide');
                } else {
                    delC(header, 'sfx-head-hide');
                }
            }
        });
        /* the matchMedia context reverts the trigger below 861px; the class
           must not outlive it */
        return function () { delC(header, 'sfx-head-hide'); hidden = false; };
    }

    /* ----------------------------------------------------------------------
       7. BOOT
       ---------------------------------------------------------------------- */
    function boot() {
        try {
            /* motion-policy's failsafe fired before we got here (a slow CDN):
               the copy has been visible for a while, so leave it be rather
               than hide it now and replay it */
            if (lineEls.length && !hasC(html, 'sfx-lines')) lineEls = [];

            lineEls.forEach(buildLines);
            openEls.forEach(buildOpen);
            if (!isIndex) buildIntro();
            /* Both of these are desktop-only, for the same reason: below 861px
               the stacked layouts make the movement land on top of content
               rather than beside it. matchMedia reverts the tween — and with
               it the parked transform — when the query stops matching, which
               a plain width check at boot would not do on a rotate or resize. */
            gsap.matchMedia().add('(min-width: 861px)', buildFooter);
            gsap.matchMedia().add('(min-width: 861px)', buildHeader);
            html.setAttribute('data-sfx-ready', '1');
        } catch (e) {
            standDown();
            for (var i = 0; i < lineEls.length; i++) addC(lineEls[i], 'sfx-split');
        }
        win.SGScrollFX = { lines: lineEls.length, open: openEls.length };
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    /* photographs settle after paint and move every start/end computed above */
    win.addEventListener('load', function () { ST.refresh(); });

})(window, document);
