/* ==========================================================================
   SACHDEVA GROUP — DEFERRED HERO VIDEO
   ==========================================================================
   THE PROBLEM

   images/banner/banner.mp4 is 9.3 MB. It is 85% of everything the home page
   transfers, and it used to be requested by the parser, in the first
   viewport, as `<video autoplay muted loop playsinline preload="metadata">`
   with a src on the <source>.

   `preload="metadata"` reads like a promise that only the header will be
   fetched, and it is — right up until `autoplay` is also present. autoplay
   overrides it: the browser has been told to start playing as soon as it
   can, so it starts buffering immediately and keeps going. The whole file
   competes with the stylesheets, the scripts and the fonts for bandwidth
   during the exact window in which the page is trying to become visible.

   On a phone on mobile data that is the entire "site takes forever to open"
   complaint in one request.

   WHAT THIS DOES

   The <source> now carries data-src instead of src, so the parser has
   nothing to fetch and the poster paints on its own. This file attaches the
   real source later, and only when the video is worth having:

     - after window `load`, so it queues behind everything needed to render,
       and in an idle callback where one exists
     - not below 992px. A 9.3 MB download for a background texture on a phone
       is not a trade anyone would choose, and the poster is a photograph of
       the same yard
     - not when the Network Information API reports Save-Data, 2g or slow-2g
     - not under prefers-reduced-motion, where a looping background video is
       the thing the setting exists to suppress

   In every skipped case the poster stays, which is what the hero looked like
   during loading anyway. Nothing else changes: js/motion.js keeps its
   ScrollTrigger that pauses the video off screen, and its play() call is
   already wrapped in a catch for the case where there is no source yet.
   ========================================================================== */

(function (win, doc) {
    'use strict';

    var MIN_WIDTH = 992;

    function connectionIsPoor() {
        var c = win.navigator && (win.navigator.connection ||
                                  win.navigator.mozConnection ||
                                  win.navigator.webkitConnection);
        if (!c) { return false; }          /* unknown, so do not assume poor */
        if (c.saveData) { return true; }
        var t = c.effectiveType || '';
        return t === 'slow-2g' || t === '2g';
    }

    function reducedMotion() {
        return !!(win.matchMedia &&
                  win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function shouldLoad() {
        if (win.innerWidth < MIN_WIDTH) { return false; }
        if (connectionIsPoor()) { return false; }
        if (reducedMotion()) { return false; }
        return true;
    }

    function attach() {
        var video = doc.querySelector('.mrn-hero__media video');
        if (!video) { return; }

        var source = video.querySelector('source[data-src]');
        if (!source) { return; }

        if (!shouldLoad()) {
            /* Leave the poster in place and take the element out of the
               accessibility tree — an empty <video> announces itself as a
               media player the user can operate, and this one cannot be. */
            video.setAttribute('aria-hidden', 'true');
            return;
        }

        source.setAttribute('src', source.getAttribute('data-src'));
        source.removeAttribute('data-src');
        video.load();

        var p = video.play();
        if (p && p.catch) { p.catch(function () { }); }
    }

    function schedule() {
        if (win.requestIdleCallback) {
            win.requestIdleCallback(attach, { timeout: 2500 });
        } else {
            win.setTimeout(attach, 900);
        }
    }

    if (doc.readyState === 'complete') {
        schedule();
    } else {
        win.addEventListener('load', schedule, false);
    }
})(window, document);
