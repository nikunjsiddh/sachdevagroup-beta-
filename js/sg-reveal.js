/* ==========================================================================
   SG REVEAL — one-by-one scroll choreography for index.html
   ==========================================================================
   Ported from the Kalash Decor motion engine (C:\xampp2\htdocs\kalash),
   keeping its behaviour exactly:

     - [data-anim="..."] marks anything that should arrive on scroll.
     - Elements that enter the viewport TOGETHER are sorted into reading
       order (top, then left) and staggered one-by-one, so a row of cards
       lands left-to-right and a section lands top-to-bottom.
     - [data-d] authors an explicit delay and wins over the auto cascade.
     - [data-stagger] on a parent spaces its [data-anim] descendants.
     - Once an element is fully offscreen it RE-ARMS, so the choreography
       replays every pass through the page, in both directions.
     - .settled zeroes the delay after arrival so hover transitions on the
       same element feel instant instead of inheriting the stagger.
     - A slow safety sweep catches anything an observer missed (throttled
       tab, odd viewport). No-op in normal use.

   MOTION POLICY — matches Kalash deliberately: the full choreography runs
   on every visit regardless of the OS "reduce motion" setting, because that
   is how the reference project behaves and how this site is expected to
   look. ?motion=reduced previews the opacity-only version.
   To honour the OS setting instead, change REDUCED below to:
       var reduced = /[?&]motion=reduced\b/.test(location.search) ||
           (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
   ========================================================================== */

(function () {
    'use strict';

    function qsa(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    var reduced = /[?&]motion=reduced\b/.test(window.location.search);
    var docEl = document.documentElement;

    docEl.className += ' sg-anim';
    if (reduced) docEl.className += ' sg-anim-reduced';

    /* ------------------------------------------------------------------
       Authored delays
    ------------------------------------------------------------------ */
    function applyDelays() {
        qsa('[data-d]').forEach(function (el) {
            el.style.setProperty('--d', parseFloat(el.getAttribute('data-d')) + 's');
        });
        qsa('[data-stagger]').forEach(function (parent) {
            var step = parseFloat(parent.getAttribute('data-stagger')) || 0.08;
            var base = parseFloat(parent.getAttribute('data-d')) || 0;
            qsa('[data-anim]', parent).forEach(function (el, i) {
                el.style.setProperty('--d', (base + i * step).toFixed(2) + 's');
            });
        });
    }

    /* ------------------------------------------------------------------
       Reveal — batched, sorted into reading order, staggered one-by-one
    ------------------------------------------------------------------ */
    var settleTimers = (typeof WeakMap === 'function') ? new WeakMap() : null;

    function revealBatch(els) {
        els.sort(function (a, b) {
            var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            return (ra.top - rb.top) || (ra.left - rb.left);
        });
        els.forEach(function (el, i) {
            var authored = el.getAttribute('data-d');
            var d = authored !== null ? parseFloat(authored) : i * 0.09;
            el.style.setProperty('--d', d.toFixed(2) + 's');
            el.className += ' in';
            var t = setTimeout(function () {
                if (/\bin\b/.test(el.className)) el.className += ' settled';
            }, 1700 + i * 90);
            if (settleTimers) settleTimers.set(el, t);
        });
    }

    function strip(el, cls) {
        el.className = (' ' + el.className + ' ')
            .split(' ' + cls + ' ').join(' ')
            .replace(/^\s+|\s+$/g, '');
    }

    var hasIO = ('IntersectionObserver' in window) &&
        ('isIntersecting' in window.IntersectionObserverEntry.prototype);

    function boot() {
        applyDelays();

        var targets = qsa('[data-anim]');
        if (!targets.length) return;

        if (!hasIO) {
            targets.forEach(function (el) { el.className += ' in settled'; });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            var batch = [];
            entries.forEach(function (en) {
                if (en.isIntersecting && !/\bin\b/.test(en.target.className)) batch.push(en.target);
            });
            if (batch.length) revealBatch(batch);
        }, { threshold: 0.01, rootMargin: '0px 0px -12% 0px' });

        /* re-arm once fully offscreen so the choreography replays */
        var rearmIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting && /\bin\b/.test(en.target.className)) {
                    strip(en.target, 'in');
                    strip(en.target, 'settled');
                    if (settleTimers) clearTimeout(settleTimers.get(en.target));
                }
            });
        }, { threshold: 0, rootMargin: '12% 0px 12% 0px' });

        targets.forEach(function (el) { io.observe(el); rearmIO.observe(el); });

        /* safety net — anything visible but unrevealed gets swept in */
        setInterval(function () {
            var vh = window.innerHeight;
            if (!vh) return;
            var missed = [];
            qsa('[data-anim]').forEach(function (el) {
                if (/\bin\b/.test(el.className)) return;
                var r = el.getBoundingClientRect();
                if (r.bottom > 0 && r.top < vh * 0.92 && r.width > 0) missed.push(el);
            });
            if (missed.length) revealBatch(missed);
        }, 2500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, false);
    } else {
        boot();
    }
})();
