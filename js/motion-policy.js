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

    /* ARRIVAL — a fresh load, a reload, or a visit from another site. A click
       from one of our own pages to the next is not one, so moving around the
       site stays quick. Both intros below key on it. */
    var arrival = true;
    try {
        var nav = (w.performance && w.performance.getEntriesByType) ?
            w.performance.getEntriesByType('navigation')[0] : null;
        var type = nav ? nav.type : 'navigate';
        var internal = !!d.referrer && new w.URL(d.referrer).origin === w.location.origin;
        arrival = type !== 'back_forward' && !(type === 'navigate' && internal);
    } catch (e) { arrival = true; }

    /* intro gate — opt-in per page, only while motion is wanted, and only on
       an arrival; the hero still settles in on a click between our pages.
       sfx-arm paints the curtain and is dropped once it has lifted; sfx-curtain
       stays for the page view so the stylesheet can sequence the hero's own
       CSS entrances behind it. When the load mark is drawn (below) its sheet
       IS the curtain and js/scroll-fx.js drops sfx-arm at boot — it is still
       armed here so there is one failsafe contract, not two. */
    if (wantMotion && arrival && h.hasAttribute('data-sfx-intro')) {
        addClass('sfx-arm'); addClass('sfx-curtain');
    }

    /* failsafe for both gates js/scroll-fx.js can set: if it never reports
       in, nothing stays hidden */
    w.setTimeout(function () {
        if (h.getAttribute('data-sfx-ready')) return;
        h.className = (' ' + h.className + ' ').replace(/ sfx-(arm|lines) /g, ' ').replace(/^\s+|\s+$/g, '');
    }, 2500);

    /* THE LOAD MARK — the logo loader, .sgl (MOTION.md "The load mark")
       Its markup and CSS are inline in every page so it paints on the very
       first frame with nothing to fetch, and it is display:none unless this
       script sets html.sgl-on — so with no JS nothing is ever hidden. Drawn
       on arrivals only, the curtain's own rule, and only while motion is
       wanted. The choreography is CSS keyframes clocked from first paint,
       which means the stylesheet guarantees the exit: the sheet lifts at
       1.55s and is gone at 2.65s whatever happens here. This script only
       listens for that lift, tells the engines so the hero plays as the
       sheet clears rather than underneath it, and holds the scroll until
       then. Three classes:
         sgl-on     the mark is visible          — removed when it is gone
         sgl-lock   html/body overflow:hidden    — removed at the lift
         sgl-drawn  a mark was drawn this view   — never removed; the
                    stylesheet delays the hero's own CSS entrances on it */
    function delClass(c) {
        h.className = (' ' + h.className + ' ').split(' ' + c + ' ').join(' ').replace(/^\s+|\s+$/g, '');
    }
    var L = w.SG_LOADER = {
        active: false, lifted: false, done: false, _l: [], _d: [],
        onLift: function (fn) { if (!L.active || L.lifted) fn(); else L._l.push(fn); },
        onDone: function (fn) { if (!L.active || L.done) fn(); else L._d.push(fn); }
    };
    function drain(q) { for (var i = 0; i < q.length; i++) { try { q[i](); } catch (e) { } } }
    function announce(name) { try { d.dispatchEvent(new w.CustomEvent(name)); } catch (e) { } }

    if (wantMotion && arrival) {
        L.active = true;
        addClass('sgl-on'); addClass('sgl-lock'); addClass('sgl-drawn');

        var lifted = function () {
            if (L.lifted) return;
            L.lifted = true;
            delClass('sgl-lock');
            if (w.lenis && w.lenis.start) { try { w.lenis.start(); } catch (e) { } }
            var q = L._l; L._l = []; drain(q);
            announce('sg:loader:lift');
        };
        var finished = function () {
            if (L.done) return;
            lifted();
            L.done = true;
            var el = d.querySelector('.sgl');
            if (el && el.parentNode) el.parentNode.removeChild(el);
            delClass('sgl-on');
            var q = L._d; L._d = []; drain(q);
            announce('sg:loader:done');
        };
        var wire = function () {
            var el = d.querySelector('.sgl');
            /* a page without the mark has nothing to hold for */
            if (!el) { finished(); return; }
            if (w.lenis && w.lenis.stop) { try { w.lenis.stop(); } catch (e) { } }
            el.addEventListener('animationstart', function (e) { if (e.animationName === 'sgl-lift') lifted(); }, false);
            el.addEventListener('animationend', function (e) { if (e.animationName === 'sgl-lift') finished(); }, false);
        };
        if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', wire, false);
        else wire();

        /* belt and braces: whatever happens to those events, the page is
           interactive again inside 3.5s */
        w.setTimeout(finished, 3500);
    }

    w.SG_MOTION_POLICY = { mode: mode, osReduce: osReduce, shim: !!shim, wantMotion: wantMotion, arrival: arrival };
})(window, document);
