/* ==========================================================================
   SACHDEVA GROUP — MOTION POLICY
   Loads FIRST in <head>, before any stylesheet, on every page.
   ==========================================================================
   WHY THIS FILE EXISTS
     Every motion engine on the site — Lenis in js/main.js, js/marine.js,
     js/index-motion.js, js/motion.js, js/scroll-drift.js, js/scroll-fx.js and
     ~22 `@media (prefers-reduced-motion: reduce)` blocks with !important — stands
     down when the browser reports reduced motion. On Windows that flag is set
     by ONE switch, Settings › Accessibility › Visual effects › "Animation
     effects", which people turn off for performance far more often than for
     vestibular reasons. On such a machine the site arrives completely static
     and reads as if nothing was ever built — while the reference sites the
     client compares it against (studiodado.com among them) ignore the flag and
     animate regardless.

   WHAT IT DOES
     mode "on"   (default) motion runs. If the OS asks for reduced motion the
                 request is overridden: window.matchMedia answers "no
                 preference", the reduced-motion blocks in every same-origin
                 stylesheet are neutralised once parsed, and <html> gets
                 `sg-forced` so the scroll engines can run at reduced travel —
                 reduced, not removed.
     mode "auto" the OS setting is honoured exactly as before this file.
     mode "off"  everything is held in its reduced state whatever the OS says.

     The mode is read from ?motion=on|auto|off and remembered in localStorage
     under `sg-motion`, so a visitor (or the client on a machine with the
     Windows switch off) sets it once per browser.

   THE INTRO GATE
     Pages that carry <html data-sfx-intro> get `sfx-arm` here, before first
     paint, which is what lets css/scroll-fx.css draw the load curtain over the
     hero from the very first frame. js/scroll-fx.js lifts it. If that file
     never reports in — CDN blocked, script error — the gate and the line gate
     are pulled after 2.5s and the page is simply visible. Nothing else is ever
     hidden ahead of time.
   ========================================================================== */
(function (w, d) {
    'use strict';

    var h = d.documentElement;
    var KEY = 'sg-motion';
    var RE_REDUCE = /\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/gi;
    var RE_NOPREF = /\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/gi;

    function addClass(c) { h.className += (h.className ? ' ' : '') + c; }

    var mode = 'on';
    try {
        var m = /[?&]motion=(on|off|auto)\b/.exec(w.location.search || '');
        if (m) w.localStorage.setItem(KEY, m[1]);
        mode = w.localStorage.getItem(KEY) || 'on';
    } catch (e) { mode = 'on'; }

    var real = (typeof w.matchMedia === 'function') ? w.matchMedia.bind(w) : null;
    var osReduce = real ? real('(prefers-reduced-motion: reduce)').matches : false;

    /* what the page should do; "auto" simply repeats the OS answer */
    var wantMotion = (mode === 'on') || (mode === 'auto' && !osReduce);

    /* the shim is only installed when that answer differs from the OS one */
    var shim = real && (wantMotion === osReduce);

    if (mode === 'on' && osReduce) addClass('sg-forced');
    if (mode === 'off') addClass('sg-motion-off');

    /* rewrite a reduced-motion clause into a width query that always gives
       the wanted answer, so compound queries keep their other half intact */
    function rewrite(q) {
        return String(q)
            .replace(RE_REDUCE, wantMotion ? '(max-width: 0px)' : '(min-width: 0px)')
            .replace(RE_NOPREF, wantMotion ? '(min-width: 0px)' : '(max-width: 0px)');
    }

    if (shim) {
        w.matchMedia = function (q) { return real(rewrite(q)); };

        /* the same rewrite for the stylesheets, once they are parsed. Cross-
           origin sheets (Google Fonts) throw on cssRules and are skipped —
           they carry no motion rules. */
        var fixSheets = function () {
            var sheets = d.styleSheets, i, j, rules, r, mt;
            for (i = 0; i < sheets.length; i++) {
                try { rules = sheets[i].cssRules; } catch (e) { continue; }
                if (!rules) continue;
                for (j = 0; j < rules.length; j++) {
                    r = rules[j];
                    if (!r.media || !r.media.mediaText) continue;
                    mt = r.media.mediaText;
                    if (!/prefers-reduced-motion/i.test(mt)) continue;
                    try { r.media.mediaText = rewrite(mt); } catch (e) { /* read-only sheet */ }
                }
            }
        };
        if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fixSheets, false);
        else fixSheets();
    }

    /* intro gate — opt-in per page, only while motion is wanted, and only on
       an ARRIVAL: a fresh load, a reload, or a visit from another site. A
       click from one of our own pages to the next skips the curtain, so
       moving around the site stays quick; the hero still settles in. */
    if (wantMotion && h.hasAttribute('data-sfx-intro')) {
        var arrival = true;
        try {
            var nav = (w.performance && w.performance.getEntriesByType) ?
                w.performance.getEntriesByType('navigation')[0] : null;
            var type = nav ? nav.type : 'navigate';
            var internal = !!d.referrer && new w.URL(d.referrer).origin === w.location.origin;
            arrival = type !== 'back_forward' && !(type === 'navigate' && internal);
        } catch (e) { arrival = true; }
        /* sfx-arm paints the curtain and is dropped once it has lifted;
           sfx-curtain stays for the page view so the stylesheet can sequence
           the hero's own CSS entrances behind the curtain */
        if (arrival) { addClass('sfx-arm'); addClass('sfx-curtain'); }
    }

    /* failsafe for both gates js/scroll-fx.js can set: if it never reports
       in, nothing stays hidden */
    w.setTimeout(function () {
        if (h.getAttribute('data-sfx-ready')) return;
        h.className = (' ' + h.className + ' ').replace(/ sfx-(arm|lines) /g, ' ').replace(/^\s+|\s+$/g, '');
    }, 2500);

    w.SG_MOTION_POLICY = { mode: mode, osReduce: osReduce, shim: !!shim };
})(window, document);
