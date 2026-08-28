/* ==========================================================================
   SACHDEVA GROUP — SCROLL DRIFT
   ==========================================================================
   WHAT THIS ADDS, AND WHY IT IS A SEPARATE FILE

   Measured against the reference (cayenneblackedition.com), which runs the
   same stack we do — GSAP 3.13 + ScrollTrigger + Lenis. Its 36 triggers are
   not doing anything exotic; 23 of them are one shape repeated:

       start: 'top bottom'   end: 'bottom top'   scrub: true

   ...i.e. the full travel of a section through the viewport, with TWO layers
   moving at different rates:

       background   yPercent 15..50   ease: linear
       content      y -250..+150      ease: power1.inOut

   The second one is the part we did not have anywhere. Our own scrubbing
   moved backgrounds, plates and images — `.mrn-hero__media`,
   `.mrn-stats__bg`, `.mrn-journey__plate`, `.mrn-cta__bg` — but never the
   copy sitting on top of them. A section whose text is nailed to the page
   reads as static no matter how much the picture behind it moves, and only
   4 of index.html's 11 sections had even the background layer. about_us.html
   had no GSAP at all.

   WHY NOT PUT THIS IN js/motion.js
     motion.js sets window.SG_MOTION_ENGINE = 'gsap', which is the signal that
     stands js/marine.js and js/index-motion.js down from their own scroll
     work. index.html wants that. about_us.html does NOT — it is built on
     marine.js + index-motion.js + page-fx.js, and stripping those out would
     take every reveal on the page with them. So this file is deliberately
     additive: it never sets SG_MOTION_ENGINE, never claims an element another
     engine owns, and does nothing but add scrubbed drift.

   THE ONE RULE IT FOLLOWS
     Drift is SYMMETRIC — fromTo(+amp .. -amp) rather than the reference's
     to(-150). Theirs leaves the content permanently offset from its layout
     position and the page is designed around that. Ours has to sit inside a
     layout that already works, so the element passes through its natural
     position exactly when the section is centred, and only borrows space at
     the edges of the travel.

   MARKUP
     <section data-drift>              content drifts +/-26px (the default)
     <section data-drift="40">         ...+/-40px instead
       <div data-drift-bg>             background layer, +/-8% yPercent
       <div data-drift-bg="14">        ...+/-14% instead
       <div data-drift-content>        explicit content layer; without one the
                                       section's own .mrn-container is used

   SAFETY
     Reduced motion, no GSAP, no ScrollTrigger, or an already-initialised
     instance: the file returns and the page keeps whatever it already had.
     It hides nothing, so there is no failure mode where content disappears.
   ========================================================================== */

(function (win, doc) {
    'use strict';

    var gsap = win.gsap;
    var ST = win.ScrollTrigger || (gsap && gsap.core && gsap.core.globals && gsap.core.globals().ScrollTrigger);

    /* nothing here hides anything, so every bail-out is a no-op, not a gate */
    if (!gsap || !ST) return;
    if (win.SGScrollDrift) return;                          /* double-include */
    if (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ST);

    var CONTENT_AMP = 26;      /* px  */
    var BG_AMP = 8;            /* %   */
    var EASE_CONTENT = 'power1.inOut';
    var EASE_BG = 'none';      /* the reference uses linear for the bg layer */

    function num(v, fallback) {
        var n = parseFloat(v);
        return isFinite(n) ? n : fallback;
    }

    function list(sel, root) {
        return Array.prototype.slice.call((root || doc).querySelectorAll(sel));
    }

    /* ----------------------------------------------------------------------
       LENIS
       motion.js already does this handoff on index.html and flags it with
       __sgLenisExternal. Doing it twice would add a second raf pump and run
       Lenis at double speed, so this only steps in when nobody else has.
       ---------------------------------------------------------------------- */
    function wireLenis() {
        var lenis = win.lenis;
        if (!lenis || win.__sgLenisExternal) return;
        win.__sgLenisExternal = true;                       /* main.js loop retires */
        lenis.on('scroll', ST.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
    }

    /* ----------------------------------------------------------------------
       THE TWO LAYERS
       ---------------------------------------------------------------------- */
    function build(section) {
        var travel = {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true
        };

        /* --- background layer(s) --- */
        list('[data-drift-bg]', section).forEach(function (el) {
            var amp = num(el.getAttribute('data-drift-bg'), BG_AMP);

            /* A layer that travels +/-amp% of its own height needs that much
               bleed or the drift just walks its edge into view at both ends
               of the scroll. The scale is constant — it is set at both ends of
               the tween so only yPercent actually animates. */
            var bleed = 1 + (amp * 2) / 100 + 0.02;

            gsap.fromTo(el,
                { yPercent: -amp, scale: bleed },
                { yPercent: amp, scale: bleed, ease: EASE_BG, scrollTrigger: travel, overwrite: 'auto' });
        });

        /* --- content layer --- */
        var content = section.querySelector('[data-drift-content]') ||
                      section.querySelector(':scope > .mrn-container');
        if (!content) return;

        /* Never claim an element another engine is already transforming.
           index-motion.js arms [data-sg-in] elements with transforms carrying
           !important until they settle, and marine-pages.js writes an inline
           transform for [data-mrnp-tilt] on every pointer move — drifting
           either would be a fight this file would lose 60 times a second. */
        if (content.hasAttribute('data-sg-in') ||
            content.hasAttribute('data-mrn-tilt') ||
            content.hasAttribute('data-mrnp-tilt') ||
            content.hasAttribute('data-sg-parallax')) return;

        var amp = num(section.getAttribute('data-drift'), CONTENT_AMP);
        if (!amp) return;

        gsap.fromTo(content,
            { y: amp },
            { y: -amp, ease: EASE_CONTENT, scrollTrigger: travel, overwrite: 'auto' });
    }

    function init() {
        wireLenis();

        var sections = list('[data-drift]');
        if (!sections.length) return;

        /* Desktop only. On a phone the viewport is short enough that the
           section's full travel is most of a scroll gesture, so the same
           amplitude reads as the layout wobbling rather than as depth — and
           it is the one place the extra compositing cost is felt. */
        var mm = gsap.matchMedia();
        mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', function () {
            sections.forEach(build);
            ST.refresh();
        });

        win.SGScrollDrift = { sections: sections.length, mm: mm };
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    /* images settle after paint and change every section's height, which moves
       every start/end this file just computed */
    win.addEventListener('load', function () { ST.refresh(); });

})(window, document);
