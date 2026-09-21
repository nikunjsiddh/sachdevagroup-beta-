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
   real source later, and picks the file that suits the screen:

     - after window `load`, so it queues behind everything needed to render,
       and in an idle callback where one exists — capped at 1s. The hero's
       own animation keeps the main thread busy right after load, so the
       idle callback used to sit out its old 2.5s cap and the footage started
       well after the hero was on screen. Safari has no idle callback and
       already waited 0.9s; Chrome now waits about as long.
     - below 992px, data-src-mobile: images/banner/banner-mobile.mp4, a
       720x1280 portrait cut of the same shot at 24fps (4.4 MB). The full
       file is 2730x1536 at 48fps, and a phone hero is a tall narrow box, so
       object-fit:cover throws away about three quarters of every frame — a
       phone would download and decode 9.3 MB to show a strip down the
       middle. The cut is that strip, taken a little right of centre so the
       tower stays in shot for longer as the drone passes it, at the same
       sharpness the phone was getting out of the big file.
       Phones used to be skipped altogether, which left them a still poster
       where every other screen has moving footage.
     - if the window later grows to 992px or more (a tablet turned to
       landscape) the full file replaces the portrait cut, which would
       otherwise be blown up across a landscape hero. It picks up at the same
       second, and it only plays if the portrait cut was playing — off screen
       js/motion.js has it paused, and that stands.
     - not when the Network Information API reports Save-Data, 2g or slow-2g
     - not under prefers-reduced-motion, where a looping background video is
       the thing the setting exists to suppress

   In every skipped case the poster stays, which is what the hero looked like
   during loading anyway. Nothing else changes: js/motion.js keeps its
   ScrollTrigger that pauses the video off screen, and its play() call is
   already wrapped in a catch for the case where there is no source yet.

   REBUILDING THE PORTRAIT CUT (if banner.mp4 is ever replaced)

   The settings the current file was cut with, as one ffmpeg command:

     ffmpeg -i banner.mp4 -an
       -vf "crop=864:1536:1070:0,scale=720:1280:flags=lanczos,fps=24000/1001"
       -c:v libx264 -profile:v high -level 3.1 -preset slow -crf 30 -refs 4
       -maxrate 1000k -bufsize 2000k -pix_fmt yuv420p
       -movflags +faststart banner-mobile.mp4

   864x1536 is a 9:16 window at the source's full height; x=1070 centres it
   at 55% of the width. High@3.1 at 720x1280 is the portrait format every
   phone decoder handles. The cap holds the busy close-up at the end of the
   shot to ~1 Mbps so it streams on ordinary mobile data. Keep -movflags
   +faststart: without it the index sits at the end of the file and a phone
   has to fetch all of it before the first frame.
   ========================================================================== */

(function (win, doc) {
    'use strict';

    /* the header's own breakpoint: below it the hero is a phone or a
       portrait tablet */
    var WIDE = 992;

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

    function play(video) {
        var p = video.play();
        if (p && p.catch) { p.catch(function () { }); }
    }

    /* a tablet turned to landscape: swap the portrait cut for the full file
       once, from the same second, keeping whatever play state motion.js
       left it in */
    function upgradeWhenWide(video, source, full) {
        if (!win.matchMedia) { return; }
        var mq = win.matchMedia('(min-width: ' + WIDE + 'px)');

        function upgrade() {
            if (!mq.matches) { return; }
            if (mq.removeEventListener) { mq.removeEventListener('change', upgrade); }
            else if (mq.removeListener) { mq.removeListener(upgrade); }

            var at = video.currentTime || 0;
            var wasPlaying = !video.paused;

            function resume() {
                video.removeEventListener('loadedmetadata', resume, false);
                try { video.currentTime = at; } catch (e) { /* not seekable yet */ }
            }
            video.addEventListener('loadedmetadata', resume, false);

            /* load() re-arms autoplay, which would start a paused, off-screen
               video decoding the big file behind the visitor's back */
            if (!wasPlaying) { video.removeAttribute('autoplay'); }
            source.setAttribute('src', full);
            video.load();
            if (wasPlaying) { play(video); }
        }

        if (mq.addEventListener) { mq.addEventListener('change', upgrade); }
        else if (mq.addListener) { mq.addListener(upgrade); }
    }

    function attach() {
        var video = doc.querySelector('.mrn-hero__media video');
        if (!video) { return; }

        var source = video.querySelector('source[data-src]');
        if (!source) { return; }

        if (connectionIsPoor() || reducedMotion()) {
            /* Leave the poster in place and take the element out of the
               accessibility tree — an empty <video> announces itself as a
               media player the user can operate, and this one cannot be. */
            video.setAttribute('aria-hidden', 'true');
            return;
        }

        var full = source.getAttribute('data-src');
        var mobile = source.getAttribute('data-src-mobile');
        var narrow = !!mobile && win.innerWidth < WIDE;

        source.setAttribute('src', narrow ? mobile : full);
        source.removeAttribute('data-src');
        video.load();
        play(video);

        if (narrow) { upgradeWhenWide(video, source, full); }
    }

    function schedule() {
        if (win.requestIdleCallback) {
            win.requestIdleCallback(attach, { timeout: 1000 });
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
