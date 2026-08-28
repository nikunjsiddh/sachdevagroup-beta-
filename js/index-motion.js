/* ==========================================================================
   SG MOTION — scroll motion engine for index.html
   ==========================================================================
   Scope   : index.html only. Loaded LAST, after js/marine.js.
   Deps    : none. ES5 syntax throughout (no let/const/arrow/template string)
             so it survives on the same browsers the rest of this site targets.

   What it owns
     1. ONE shared rAF loop + ONE scroll listener + ONE resize listener,
        published as window.SGMotion so every other index-only module
        (parallax, etc.) subscribes instead of adding loops of its own.
     2. ONE IntersectionObserver driving one-shot entrances, fired when the
        element's top crosses 80% of the viewport — the reference's
        `start: "clamp(top 80%)"`.
        Vocabulary: data-sg-in="up|left|right|zoom", data-sg-delay="1..6",
        data-sg-split on a heading for per-line staggered type.
     3. Inertia smooth scroll on the REAL window scroll position — but only
        when nothing else already owns it (see ADOPT below).

   ADOPT, DO NOT DOUBLE
     js/main.js (shared by all 13 pages) already ships an inlined Lenis build
     at lines 355-1150 and instantiates it at line 1155. index.html loads
     main.js, so Lenis 1.3.17 is ALREADY driving window.scrollTo on this page
     before this file is parsed — verified in the browser, window.lenisVersion
     is set and <html> carries the `lenis` class. Starting a second inertia
     loop would mean two engines writing window.scrollTo on the same frame:
     guaranteed jitter and scroll lock. So if a foreign engine is detected this
     file does NOT start its own loop. It governs the existing one instead
     (reduced-motion kill switch, mobile-menu lock) and keeps only the anchor
     tween, which is safe in both modes. The internal lerp engine below is the
     FALLBACK, used when Lenis is absent — including old browsers where
     main.js's class-field syntax fails to parse and takes Lenis down with it.

   NO-JS / FAILED-SCRIPT SAFETY
     Every hidden initial state is armed by `html.sg-motion`. That class is set
     by a 2-line shim in <head> which also removes itself after 4s unless this
     file has stamped `data-sg-ready` on <html>; this file runs the same timer
     for the case where it loads but throws. Script blocked, 404'd or failing
     => nothing stays invisible.
   ========================================================================== */
(function (win, doc) {
    'use strict';

    var html = doc.documentElement;
    if (!html || win.SGMotion) return;

    /* GSAP STAND-DOWN
       index.html sets window.SG_MOTION_ENGINE='gsap' in its head shim and loads
       js/motion.js, which owns that page's scroll motion outright: one rAF loop
       (gsap.ticker driving Lenis), one scroll subscriber, one entrance engine
       and one parallax system. Everything this file provides would be a second
       copy of each, so it stands down whole.

       Standing down here also disarms the SG PARALLAX module at the foot of
       this file without a second flag: its boot() opens with
       `if (!SG || typeof SG.track !== 'function') return;` and window.SGMotion
       is never published on that path.

       Nothing is deleted, because this file is loaded by 12 inner pages that do
       depend on it — 39 [data-sg-split] and 12 [data-sg-in] elements, plus
       js/page-fx.js, which rides window.SGMotion.track / onScroll / onResize.
       None of those pages set the flag.

       The head shim's failsafe handles the rest: with this file standing down,
       html[data-sg-ready] is never stamped, so `sg-motion` is pulled after 4s.
       On index.html that class gates only the [data-sg-in] armed states, of
       which the page has none. js/motion.js adds `sg-scroll-auto` itself, so
       css/marine.css:37's html{scroll-behavior:smooth} still gets killed. */
    if (win.SG_MOTION_ENGINE === 'gsap') return;

    /* ------------------------------------------------------------------
       0. Environment
    ------------------------------------------------------------------ */
    function mq(q) {
        return !!(win.matchMedia && win.matchMedia(q).matches);
    }

    var reduced = mq('(prefers-reduced-motion: reduce)');
    var coarse = mq('(pointer: coarse)');
    var hasRAF = typeof win.requestAnimationFrame === 'function';
    var hasIO = ('IntersectionObserver' in win) &&
        ('isIntersecting' in win.IntersectionObserverEntry.prototype);

    /* main.js's Lenis stamps window.lenisVersion and an `lenis` class on
       <html>. Either is proof something already drives the scroll position. */
    var foreign = !!(win.lenisVersion ||
        (html.className && html.className.indexOf('lenis') > -1));

    /* class helpers — classList is IE10+, the fallbacks keep IE9 alive */
    function addC(el, c) {
        if (el.classList) { el.classList.add(c); return; }
        if ((' ' + el.className + ' ').indexOf(' ' + c + ' ') < 0) el.className += ' ' + c;
    }
    function remC(el, c) {
        if (el.classList) { el.classList.remove(c); return; }
        el.className = (' ' + el.className + ' ').split(' ' + c + ' ').join(' ').replace(/^\s+|\s+$/g, '');
    }
    function hasC(el, c) {
        return (' ' + el.className + ' ').indexOf(' ' + c + ' ') > -1;
    }

    /* Arm the hidden states. Idempotent, so it is harmless if the <head> shim
       was never applied (you just get one frame of unanimated content instead
       of a clean entrance).

       The timer is the second half of the no-JS contract: if anything below
       throws before boot() finishes, the arming class is pulled and every
       element becomes visible. The <head> shim runs the same timer for the
       case where THIS FILE never loads at all. */
    addC(html, 'sg-motion');
    var failSafe = win.setTimeout(function () { remC(html, 'sg-motion'); }, 4000);

    /* addEventListener options support (ES5 probe, no object spread) */
    var passiveOK = false;
    try {
        var probe = Object.defineProperty({}, 'passive', {
            get: function () { passiveOK = true; return false; }
        });
        win.addEventListener('sg-probe', null, probe);
        win.removeEventListener('sg-probe', null, probe);
    } catch (e) { passiveOK = false; }
    var PASSIVE = passiveOK ? { passive: true } : false;
    var ACTIVE = passiveOK ? { passive: false } : false;

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function drop(arr, fn) {
        for (var i = arr.length - 1; i >= 0; i--) if (arr[i] === fn) arr.splice(i, 1);
    }
    function scrollY() {
        return win.pageYOffset !== undefined ? win.pageYOffset : (html.scrollTop || 0);
    }
    function now() {
        return (win.performance && win.performance.now) ? win.performance.now() : +new Date();
    }

    /* ------------------------------------------------------------------
       1. Shared measurement / rAF loop
       One loop. It sleeps as soon as the page stops moving and nothing is
       animating, so an idle page costs zero frames.
    ------------------------------------------------------------------ */
    var scrollSubs = [];
    var resizeSubs = [];
    var tracked = [];

    var vh = 0, limit = 0, measuredAt = 0;
    var running = false, idle = 0, lastT = 0, lastY = 0;

    function measure() {
        vh = win.innerHeight || html.clientHeight || 0;
        var docH = Math.max(
            html.scrollHeight || 0,
            doc.body ? (doc.body.scrollHeight || 0) : 0
        );
        limit = Math.max(0, docH - vh);
        measuredAt = now();
    }

    function wake() {
        idle = 0;
        if (running || !hasRAF) return;
        if (!animating && !scrollSubs.length && !tracked.length) return;
        running = true;
        lastT = 0;
        win.requestAnimationFrame(frame);
    }

    var rects = [];

    function frame(t) {
        var dt = lastT ? (t - lastT) / 1000 : 1 / 60;
        if (dt > 0.064) dt = 0.064;      /* a tab-switch must not teleport */
        if (dt <= 0) dt = 1 / 60;
        lastT = t;

        var moved = step(dt);            /* the only place we write scroll pos */
        var y = scrollY();
        var i, n;

        /* the loop is the source of truth for "did we move", not the event */
        if (y !== lastY) { idle = 0; }

        /* READ pass — every rect first, so the whole frame costs one layout */
        n = tracked.length;
        rects.length = n;
        for (i = 0; i < n; i++) rects[i] = tracked[i].el.getBoundingClientRect();

        /* WRITE pass — subscribers may now touch styles freely */
        for (i = 0; i < n; i++) {
            var r = rects[i];
            if (r.bottom < -300 || r.top > vh + 300) continue;   /* far offscreen */
            var span = vh + r.height;
            var p = span > 0 ? (vh - r.top) / span : 0;
            tracked[i].cb(clamp(p, 0, 1), r, tracked[i].el);
        }
        for (i = 0; i < scrollSubs.length; i++) scrollSubs[i](y, vh, limit);

        if (moved || y !== lastY) idle = 0; else idle++;
        lastY = y;

        if (idle > 4) { running = false; return; }
        win.requestAnimationFrame(frame);
    }

    /* ------------------------------------------------------------------
       2. Inertia smooth scroll (fallback engine) + anchor tween
    ------------------------------------------------------------------ */
    var DAMP = 0.092;                 /* ~Lenis lerp 0.09 */
    var smoothOn = hasRAF && !reduced && !coarse && !foreign;

    var target = 0, cur = 0, animating = false, owner = '', wrote = -1, delta = 0;
    var anchorEl = null;              /* re-measured every frame, see step() */
    var locked = false;               /* mobile menu open */

    function step(dt) {
        if (!animating) return false;

        /* An anchor tween re-reads its destination every frame. The page moves
           underneath it: main.js adds .sticky_menu at scrollTop 80, which takes
           the header out of the flow and lifts everything below it by ~75px,
           and lazy images resolve as they enter view. Aiming once at the top
           would land ~75px past the heading. */
        if (owner === 'anchor' && anchorEl) {
            target = clamp(anchorEl.getBoundingClientRect().top + scrollY() - padTop(), 0, limit);
        }

        var k = 1 - Math.pow(1 - DAMP, dt * 60);   /* frame-rate independent */
        cur += (target - cur) * k;
        if (Math.abs(target - cur) < 0.4) { cur = target; animating = false; owner = ''; }
        var prev = wrote;
        wrote = Math.round(cur);
        delta = Math.abs(wrote - prev);
        win.scrollTo(0, wrote);
        return true;
    }

    function sync() {
        cur = target = scrollY();
        animating = false;
        owner = '';
        anchorEl = null;
        delta = 0;
    }

    /* Native scroll we did not cause — scrollbar drag, #toTopBtn's jQuery
       animate, scroll restoration, or Lenis when it owns the wheel. Yield.

       The tolerance matters: scroll events are dispatched asynchronously, so
       the event for the position we wrote in frame N can arrive after frame
       N+1 has already moved on. Comparing for equality treats that lag as a
       foreign scroll and kills our own tween two frames in — which is exactly
       what it did before this was widened. `delta` is the distance the lerp
       covered on the last frame, so a few frames of event lag always falls
       inside the window while a real jump never does. Deliberate user input is
       handled up front by takeover() rather than inferred from here. */
    function onScrollEvt() {
        if (animating) {
            if (Math.abs(scrollY() - wrote) <= delta * 4 + 8) { wake(); return; }
            sync();
        } else {
            cur = target = scrollY();
        }
        wake();
    }

    /* --- opt-out walk: nested scrollers, form fields, explicit escapes --- */
    function blocked(node) {
        var hop = 0;
        while (node && node.nodeType === 1 && node !== html && hop < 14) {
            var tag = node.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                node.isContentEditable === true) return true;
            if (node.hasAttribute &&
                (node.hasAttribute('data-lenis-prevent') ||
                    node.hasAttribute('data-sg-no-smooth'))) return true;
            if (scrollable(node)) return true;
            node = node.parentNode;
            hop++;
        }
        return false;
    }

    /* getComputedStyle is a layout read, so cache the answer per element for
       2s the way Lenis does — a wheel burst is ~60 events/second. */
    function scrollable(el) {
        if ((el.scrollHeight || 0) - (el.clientHeight || 0) < 2) return false;
        var t = now();
        if (el.__sgOvT && t - el.__sgOvT < 2000) return el.__sgOv;
        var ov = '';
        try { ov = win.getComputedStyle(el).overflowY; } catch (e) { ov = ''; }
        el.__sgOv = (ov === 'auto' || ov === 'scroll' || ov === 'overlay');
        el.__sgOvT = t;
        return el.__sgOv;
    }

    function onWheel(e) {
        if (!smoothOn || locked) return;
        if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;   /* pinch zoom */
        var d = e.deltaY;
        if (!d) return;
        if (e.deltaMode === 1) d *= 16.6667;        /* DOM_DELTA_LINE */
        else if (e.deltaMode === 2) d *= vh;        /* DOM_DELTA_PAGE */
        if (blocked(e.target)) return;
        if (!e.cancelable) return;

        if (now() - measuredAt > 500) measure();    /* lazy images grow the page */
        if (!animating || owner !== 'wheel') { cur = target = scrollY(); }

        var next = clamp(target + d, 0, limit);
        /* at either end, hand the gesture back so overscroll/bounce and
           pull-to-refresh still belong to the browser */
        if (next === target && (target === 0 || target === limit)) return;

        e.preventDefault();
        target = next;
        animating = true;
        owner = 'wheel';
        wake();
    }

    /* Deliberately NO keydown interception. Lenis does not intercept keys
       either, and hijacking them breaks the browser find bar, Tab focus
       scrolling, Space paging inside form fields and screen-reader caret
       movement. Native keys scroll instantly; onScrollEvt re-syncs the lerp. */

    function scrollToY(y, force, el) {
        measure();
        y = clamp(y, 0, limit);
        if (reduced || !hasRAF || (!smoothOn && !force)) {
            sync();
            win.scrollTo(0, y);
            return;
        }
        cur = scrollY();
        wrote = Math.round(cur);
        delta = 0;
        target = y;
        anchorEl = el || null;
        animating = true;
        owner = 'anchor';
        wake();
    }

    /* A wheel only ends an anchor tween — onWheel owns the wheel-driven glide
       and re-targets it rather than cancelling it. */
    function cancelAnchor() {
        if (owner === 'anchor') sync();
    }

    /* Anything that means "the user is scrolling this themselves now" ends
       whatever we were doing, so we never yank the page back. */
    var SCROLL_KEYS = {
        32: 1, 33: 1, 34: 1, 35: 1, 36: 1,   /* space, page up/down, end, home */
        37: 1, 38: 1, 39: 1, 40: 1, 9: 1     /* arrows, tab */
    };

    function takeover(e) {
        if (!animating) return;
        if (e && e.type === 'keydown' && !SCROLL_KEYS[e.keyCode]) return;
        sync();
    }

    /* ------------------------------------------------------------------
       3. Anchor links — animate through the same lerp, keep the hash,
          keep focus. Runs in BOTH modes: when Lenis owns the wheel it simply
          observes our writes as native scroll and re-syncs, exactly as it
          does for a keyboard scroll.
    ------------------------------------------------------------------ */
    function closestA(node) {
        var hop = 0;
        while (node && node.nodeType === 1 && hop < 12) {
            if (node.tagName === 'A') return node;
            node = node.parentNode;
            hop++;
        }
        return null;
    }

    function padTop() {
        var v = 0;
        try { v = parseFloat(win.getComputedStyle(html).scrollPaddingTop); } catch (e) { v = 0; }
        return isNaN(v) ? 0 : v;
    }

    function onClick(e) {
        if (e.defaultPrevented) return;
        if (e.button && e.button !== 0) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;  /* new tab / download / save */

        var a = closestA(e.target);
        if (!a) return;
        if (a.getAttribute('target')) return;

        var href = a.getAttribute('href');
        /* bare "#" and href-less anchors keep their native behaviour —
           #toTopBtn uses href="javascript:void(0)" and stays main.js's */
        if (!href || href.charAt(0) !== '#' || href.length < 2) return;

        var id = href.slice(1);
        var t = doc.getElementById(id);
        if (!t && doc.getElementsByName) t = doc.getElementsByName(id)[0];
        if (!t) return;

        e.preventDefault();

        /* focus first, then correct any focus-induced jump, then tween —
           focus({preventScroll}) is not universal, so we repair instead of
           trusting it. Skipping focus entirely would strand keyboard users at
           the top of the document after a jump link. */
        var y0 = scrollY();
        if (!t.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) {
            t.setAttribute('tabindex', '-1');
        }
        try { t.focus({ preventScroll: true }); } catch (err) { try { t.focus(); } catch (e2) { } }
        if (scrollY() !== y0) win.scrollTo(0, y0);

        var dest = t.getBoundingClientRect().top + y0 - padTop();
        scrollToY(dest, true, t);

        if (win.history && win.history.pushState) {
            try { win.history.pushState(null, '', href); } catch (e3) { }
        }
    }

    /* ------------------------------------------------------------------
       4. Governing the engine that is already there
          data-lenis-prevent on <body> is Lenis's own supported opt-out: with
          it present Lenis returns from onVirtualScroll before it ever calls
          preventDefault or scrollTo, so the wheel falls straight through to
          native scrolling. It is the only way to switch off an instance we
          have no reference to, and main.js keeps `lenis` in a module-scoped
          const. Verified live: with it set, window.scrollY still tracks
          normally and marine.js keeps receiving scroll events.
    ------------------------------------------------------------------ */
    var holdReduced = false, holdMenu = false;

    function applyHold() {
        if (!foreign || !doc.body) return;
        if (holdReduced || holdMenu) doc.body.setAttribute('data-lenis-prevent', '');
        else doc.body.removeAttribute('data-lenis-prevent');
    }

    function watchMenu() {
        var btn = doc.querySelector ? doc.querySelector('.slicknav_btn') : null;
        if (!btn) return false;

        function read() {
            var open = hasC(btn, 'slicknav_open');
            if (open === locked) return;
            locked = open;
            holdMenu = open;
            if (open) sync();
            applyHold();
        }

        if (win.MutationObserver) {
            new win.MutationObserver(read).observe(btn, {
                attributes: true, attributeFilter: ['class']
            });
        } else {
            doc.addEventListener('click', function () { win.setTimeout(read, 80); }, false);
        }
        read();
        return true;
    }

    /* ------------------------------------------------------------------
       5. Entrance orchestrator — one IntersectionObserver, one-shot
    ------------------------------------------------------------------ */
    var DUR = 1150;                   /* longest transition in the CSS */
    var STEP = 110;                   /* data-sg-delay unit, ms */
    var io = null;

    /* marine.js already animates these and writes inline transforms on some
       of them. Never take an element it owns. */
    function ownedByMarine(el) {
        return el.hasAttribute('data-mrn-reveal') ||
            el.hasAttribute('data-mrn-tilt') ||
            el.hasAttribute('data-mrn-magnetic') ||
            el.hasAttribute('data-mrn-parallax');
    }

    /* The CSS carries no exemption list — this is the only one. Anything we
       decline has its data-sg-* attributes stripped, so the armed selectors in
       css/index-theme.css section 9 stop matching it altogether. Two lists that
       could drift apart would be worse than one. */
    function collect() {
        var nodes = doc.querySelectorAll('[data-sg-in], [data-sg-split]');
        var out = [], i, el;
        for (i = 0; i < nodes.length; i++) {
            el = nodes[i];
            if (ownedByMarine(el) || el.getAttribute('data-sg-in') === 'off') {
                disarm(el);
                continue;
            }
            out.push(el);
        }
        return out;
    }

    function disarm(el) {
        el.removeAttribute('data-sg-in');
        el.removeAttribute('data-sg-split');
        el.removeAttribute('data-sg-delay');
    }

    function reveal(el) {
        addC(el, 'sg-in');
        var d = parseInt(el.getAttribute('data-sg-delay'), 10);
        var extra = el.__sgLines ? el.__sgLines * 90 : 0;
        var wait = DUR + extra + ((d > 0 ? d : 0) * STEP) + 120;
        win.setTimeout(function () { settle(el); }, wait);
    }

    /* When the entrance is done, strip the attributes that armed it so the
       element drops back to its own stylesheet rules — a later :hover transform
       is then never out-specificity'd by our .sg-in state.
       .sg-shown is the one thing we leave behind: it pins opacity, because some
       elements on this page carry their own `opacity:0` and rely on a third
       party to lift it (index-theme.css:3502 `#process .mrn-step h4`), and
       removing our attribute must never drop one back into that hole. */
    function settle(el) {
        disarm(el);
        remC(el, 'sg-in');
        addC(el, 'sg-shown');
        el.__sgDone = true;
    }

    function initEntrances() {
        var list = collect();
        if (!list.length) return;
        var i;

        /* CALM TIER — reduced motion is not the same as no motion.
           This used to settle every element at load whenever the user asked
           for reduced motion, which on Windows is switched by "Show animations
           in Windows" and by the "Adjust for best performance" profile. The
           result on any machine with that off was the entire site arriving
           pre-revealed: no entrance, no scroll response, nothing to read as
           motion at all — 45 of 45 elements already shown before the first
           scroll.

           What the preference actually asks us to remove is VESTIBULAR motion:
           travel, parallax, zoom, spin. A short opacity fade is not that, and
           is the accepted way to keep a page feeling alive for these users.
           So the entrance still runs on scroll; css/index-theme.css strips the
           transform off it under html.sg-calm, leaving opacity alone.

           Parallax and scroll-coupled drift stay off entirely — those ARE the
           vestibular case. See js/scroll-drift.js, which still returns at its
           own guard. */
        if (!hasIO) {                            /* no observer: no choice */
            for (i = 0; i < list.length; i++) settle(list[i]);
            return;
        }

        if (reduced) {
            addC(doc.documentElement, 'sg-calm');
        } else {
            for (i = 0; i < list.length; i++) split(list[i]);
        }

        /* rootMargin bottom -20% pulls the root rect up by 20vh, so the entry
           fires the instant the element's top passes 80% of the viewport —
           the reference's `start: "clamp(top 80%)"`. */
        io = new win.IntersectionObserver(function (entries) {
            for (var k = 0; k < entries.length; k++) {
                if (!entries[k].isIntersecting) continue;
                io.unobserve(entries[k].target);      /* one-shot */
                reveal(entries[k].target);
            }
        }, { root: null, rootMargin: '0px 0px -20% 0px', threshold: 0 });

        for (i = 0; i < list.length; i++) io.observe(list[i]);
    }

    /* ------------------------------------------------------------------
       6. Heading line split — the SplitText equivalent
          Words are wrapped, then grouped into visual lines by their rect top.
          No line WRAPPER element is created, so nested <em>/<b>/<span> in the
          heading survive untouched; each word just carries its line index in
          --sg-l and the CSS turns that into the per-line stagger.
    ------------------------------------------------------------------ */
    function split(el) {
        if (!el.hasAttribute('data-sg-split') || el.__sgSplit) return;

        if (el.getAttribute('data-sg-split') === 'off' ||
            (el.querySelector && el.querySelector('.mrn-word'))) {   /* hero type owns itself */
            /* no .sg-shown here: a declined element must go back to its OWN
               rules untouched. The hero title, for instance, fades itself in
               with a CSS animation, and an !important opacity would beat it. */
            el.removeAttribute('data-sg-split');
            return;
        }

        wrapWords(el);
        el.__sgSplit = true;
        el.removeAttribute('data-sg-in');   /* the words animate, not the box */
        relineOne(el);
        addC(el, 'sg-split');               /* box visible, words still armed */
    }

    function wrapWords(node) {
        var kids = [], i, k;
        for (i = 0; i < node.childNodes.length; i++) kids.push(node.childNodes[i]);

        for (i = 0; i < kids.length; i++) {
            k = kids[i];
            if (k.nodeType === 3) {
                var txt = k.nodeValue;
                if (!txt || !/\S/.test(txt)) continue;
                var parts = txt.split(/(\s+)/);
                var frag = doc.createDocumentFragment();
                for (var j = 0; j < parts.length; j++) {
                    if (!parts[j]) continue;
                    if (/^\s+$/.test(parts[j])) {
                        /* real space nodes, so selection, copy/paste and
                           screen-reader word boundaries survive the split */
                        frag.appendChild(doc.createTextNode(parts[j]));
                    } else {
                        var s = doc.createElement('span');
                        s.className = 'sg-w';
                        s.appendChild(doc.createTextNode(parts[j]));
                        frag.appendChild(s);
                    }
                }
                k.parentNode.replaceChild(frag, k);
            } else if (k.nodeType === 1 && k.tagName !== 'BR' && !hasC(k, 'sg-w')) {
                wrapWords(k);
            }
        }
    }

    function relineOne(el) {
        if (el.__sgDone) return;
        var ws = el.getElementsByClassName ?
            el.getElementsByClassName('sg-w') : el.querySelectorAll('.sg-w');
        if (!ws.length) return;

        var lh = 0, fs = 0;
        try {
            var cs = win.getComputedStyle(el);
            lh = parseFloat(cs.lineHeight);      /* "normal" parses to NaN */
            fs = parseFloat(cs.fontSize);
        } catch (e) { }
        if (!lh || isNaN(lh)) lh = (fs || 16) * 1.2;

        /* Cluster on rect top with a tolerance of 60% of a line box, not on
           exact equality: a larger <em> on the same visual line sits a few
           pixels higher, while the next line is a whole line-height away. */
        var tol = lh * 0.6;

        var tops = [], i;
        for (i = 0; i < ws.length; i++) tops[i] = ws[i].getBoundingClientRect().top;

        var line = -1, base = null;
        for (i = 0; i < ws.length; i++) {
            if (base === null || Math.abs(tops[i] - base) > tol) { line++; base = tops[i]; }
            if (ws[i].style.setProperty) ws[i].style.setProperty('--sg-l', line);
            else ws[i].style.cssText += ';--sg-l:' + line;
        }
        el.__sgLines = line;
    }

    function reline() {
        var els = doc.querySelectorAll('[data-sg-split]');
        for (var i = 0; i < els.length; i++) {
            if (els[i].__sgSplit && !hasC(els[i], 'sg-in')) relineOne(els[i]);
        }
    }

    /* ------------------------------------------------------------------
       7. Public registry — one loop for the whole page
    ------------------------------------------------------------------ */
    var resizeTimer = null;

    function onResizeEvt() {
        measure();
        if (resizeTimer) win.clearTimeout(resizeTimer);
        resizeTimer = win.setTimeout(function () {
            resizeTimer = null;
            measure();
            reline();
            for (var i = 0; i < resizeSubs.length; i++) resizeSubs[i](vh, limit);
            if (animating) sync();
            wake();
        }, 140);
        wake();
    }

    var API = {
        version: '1.0.0',

        /* environment, so subscribers do not each re-run matchMedia */
        reduced: reduced,
        coarse: coarse,
        /* true when THIS file drives the scroll position */
        smooth: false,
        /* true when a foreign engine (main.js's Lenis) drives it */
        foreignEngine: foreign,

        /* fn(y, vh, limit) — called once per frame while the page moves */
        onScroll: function (fn) {
            if (typeof fn !== 'function') return function () { };
            scrollSubs.push(fn);
            wake();
            return function () { drop(scrollSubs, fn); };
        },

        /* fn(vh, limit) — debounced */
        onResize: function (fn) {
            if (typeof fn !== 'function') return function () { };
            resizeSubs.push(fn);
            return function () { drop(resizeSubs, fn); };
        },

        /* Scrub helper for parallax and friends.
           cb(progress, rect, el) where progress is 0 when the element's top is
           at the viewport bottom and 1 when its bottom is at the viewport top —
           the reference's `start:"clamp(top bottom)" end:"clamp(bottom top)"`
           range. Rects for every tracked element are read in ONE batch before
           any callback runs, so a frame costs one layout, not N, and a callback
           writing styles can never force a reflow on the next read. */
        track: function (el, cb) {
            if (!el || typeof cb !== 'function') return function () { };
            var rec = { el: el, cb: cb };
            tracked.push(rec);
            wake();
            return function () {
                for (var i = tracked.length - 1; i >= 0; i--) {
                    if (tracked[i] === rec) tracked.splice(i, 1);
                }
            };
        },

        /* animate the real window scroll to a y or an element */
        scrollTo: function (to, offset) {
            var y;
            if (typeof to === 'number') y = to;
            else if (to && to.getBoundingClientRect) y = to.getBoundingClientRect().top + scrollY() - padTop();
            else return;
            /* only re-measure when no manual offset is in play, or we would
               keep overwriting the caller's intent every frame */
            scrollToY(y + (offset || 0), true, offset ? null : to);
        },

        /* re-measure after a layout change (fonts, lazy images, filters) */
        refresh: function () {
            measure();
            reline();
            for (var i = 0; i < resizeSubs.length; i++) resizeSubs[i](vh, limit);
            wake();
        },

        /* force a tick without waiting for a scroll */
        request: function () { wake(); },

        scrollY: scrollY,
        viewport: function () { return vh; },
        limit: function () { return limit; }
    };

    win.SGMotion = API;

    /* ------------------------------------------------------------------
       8. Boot
    ------------------------------------------------------------------ */
    function boot() {
        measure();
        lastY = scrollY();
        sync();

        initEntrances();

        /* Reduced motion: stop the engine that is already running. We cannot
           reach main.js's Lenis instance, so we use its own opt-out hook.
           Coarse pointers are deliberately NOT held here — Lenis ships with
           syncTouch:false, so touch scrolling is already native, and a
           touchscreen laptop still deserves a smooth wheel. */
        holdReduced = reduced;
        applyHold();

        if (smoothOn) {
            API.smooth = true;
            addC(html, 'sg-scroll-auto');   /* kill marine.css:37 html{scroll-behavior:smooth} */
            doc.addEventListener('wheel', onWheel, ACTIVE);
        } else if (foreign && !reduced) {
            addC(html, 'sg-scroll-auto');
        }

        /* whatever we are animating must yield the moment the user takes over */
        doc.addEventListener('wheel', cancelAnchor, PASSIVE);
        doc.addEventListener('touchstart', takeover, PASSIVE);
        doc.addEventListener('keydown', takeover, PASSIVE);
        doc.addEventListener('pointerdown', takeover, PASSIVE);
        doc.addEventListener('click', onClick, false);

        win.addEventListener('scroll', onScrollEvt, PASSIVE);
        win.addEventListener('resize', onResizeEvt, PASSIVE);

        /* SCROLL-EVENT INDEPENDENCE.
           main.js instantiates Lenis, and a third-party scroller can swallow
           or coalesce the native scroll event — measured on this page: the
           document moved 8972 -> 9689 with ZERO scroll events dispatched, so
           anything waiting on that event silently stops updating. Nothing here
           may depend on it. These listeners only WAKE the shared loop; the
           loop itself compares window.pageYOffset each frame (see frame()),
           so the source of the motion is irrelevant. They are passive and the
           loop still parks itself when the page stops moving. */
        win.addEventListener('wheel', wake, PASSIVE);
        win.addEventListener('touchmove', wake, PASSIVE);
        win.addEventListener('touchstart', wake, PASSIVE);
        doc.addEventListener('visibilitychange', function () {
            if (!doc.hidden) { API.refresh(); wake(); }
        }, false);
        win.addEventListener('orientationchange', onResizeEvt, false);

        /* slicknav is built by main.js on jQuery ready, which may land after
           us — retry once rather than poll. */
        if (!watchMenu()) win.setTimeout(watchMenu, 400);

        /* fonts and lazy images invalidate every measurement we just took */
        win.addEventListener('load', function () { API.refresh(); }, false);
        if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) {
            doc.fonts.ready.then(function () { API.refresh(); });
        }

        /* we made it — stand the fail-safes down */
        win.clearTimeout(failSafe);
        html.setAttribute('data-sg-ready', '1');
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', boot, false);
    } else {
        boot();
    }
})(window, document);


/* ==========================================================================
   SG PARALLAX — the reference's "view images while scrolling"
   ==========================================================================
   Module of js/index-motion.js. Append AFTER the SG MOTION IIFE.
   Owns nothing but "transform" on layers it creates, plus a will-change it
   clears again. No rAF, no scroll listener, no resize listener, no observer of
   its own — it rides SGMotion.track(), whose per-frame READ pass batches every
   rect before any callback writes, so a frame costs one layout for the page.

   Structure (the measured reference pattern, three layers deep):
       clip box       overflow:hidden — ALREADY on the page for every target
         .sg-plx-box    OVERSCANNED by --sg-over, absolute. THIS is what moves.
           .sg-plx-img    inset:0, object-fit:cover

   The boxes are built here at boot rather than in index.html so that with the
   script blocked, 404'd or throwing, the markup is untouched and every
   photograph renders exactly as it does today. Nothing can stay hidden.

   Travel  = --sg-over * 0.80, i.e. y sweeps [-0.4*O .. +0.4*O] against an
   overhang of O/2 at each edge. 10% guard, at every box height and viewport.
   Full derivation in the parallax block of css/index-theme.css.

   Ownership: .mrn-stats__bg and .mrn-cta__bg are TAKEN OVER from js/marine.js
   (markup patches A + B drop their data-mrn-parallax). .mrn-hero__media,
   .mrn-journey__plate and both .mrn-cta__orb layers stay with marine.js.
   .mrn-figure__frame carries an inline transform from marine's data-mrn-tilt,
   so the About photo is parallaxed on the box INSIDE the frame, never on the
   frame itself.
   ========================================================================== */
(function (win, doc) {
    'use strict';

    var ARM = 'sg-plx';
    var RATIO = 0.80;      /* travel = --sg-over * RATIO -> 10% guard per edge */
    var TAU = 0.16;        /* s. Exponential catch-up ~ the reference scrub:0.85 */
    var LAG_CAP = 0.12;    /* never sit more than 12% of travel behind target */
    var EPS = 0.04;        /* px. Below this we do not touch the style object */
    var FALLBACK = 96;     /* px, if --sg-over is missing from the cascade */

    /* clip boxes that already contain a real <img> — wrapped at boot */
    var CLIPS = [
        '#about .mrn-figure__frame',
        '#companies .mrn-unit .sg-plx-clip',
        '#commitment .mrn-card__img',
        '#yard .mrn-tile'
    ];

    /* [section to measure, layer to move] — already absolute inside an
       overflow:hidden section, so these need no wrapper */
    var BANDS = [
        ['.mrn-stats', '.mrn-stats__bg[data-sg-parallax]'],
        ['.mrn-cta', '.mrn-cta__bg[data-sg-parallax]']
    ];

    var html = doc.documentElement;
    var items = [];
    var SG = null;
    var alpha = 0.1;
    var lastT = 0;
    var halted = false;

    function clock() {
        return (win.performance && win.performance.now) ? win.performance.now() : +new Date();
    }

    function hasC(el, c) { return (' ' + el.className + ' ').indexOf(' ' + c + ' ') > -1; }
    function addC(el, c) { if (!hasC(el, c)) el.className += (el.className ? ' ' : '') + c; }
    function delC(el, c) {
        if (!hasC(el, c)) return;
        el.className = (' ' + el.className + ' ').split(' ' + c + ' ').join(' ')
            .replace(/^\s+|\s+$/g, '');
    }

    /* custom properties carry the overscan, translate3d carries the motion.
       No support for either => no wrapper, no class, no parallax, page intact. */
    function supported() {
        var C = win.CSS;
        if (!C || typeof C.supports !== 'function') return false;
        try {
            if (!(C.supports('--sg-probe', '0') || C.supports('(--sg-probe: 0)'))) return false;
            return C.supports('transform', 'translate3d(0px, 0px, 0px)');
        } catch (e) {
            return false;
        }
    }

    /* read once per layer at boot and again on resize — media queries move it */
    function overscan(el) {
        var v = NaN;
        try { v = parseFloat(win.getComputedStyle(el).getPropertyValue('--sg-over')); }
        catch (e) { v = NaN; }
        return (v > 0) ? v : FALLBACK;
    }

    function paint(it, force) {
        var y = Math.round(it.cur * 100) / 100;
        if (!force && it.applied !== null && Math.abs(y - it.applied) < EPS) return;
        it.applied = y;
        it.layer.style.transform = 'translate3d(0, ' + y + 'px, 0)';
    }

    /* p is SGMotion's clamp(top bottom) -> clamp(bottom top) progress:
       0 when the box's top sits on the viewport bottom, 1 when its bottom
       sits on the viewport top. Rest (0.5) is the centre of the overscan. */
    function follow(it, p) {
        if (halted) return;

        /* SELF-CLOCKING. alpha was stamped from an SG.onScroll subscription,
           which assumes a native scroll event lands every frame. Lenis
           (bundled in js/main.js) swallows those - measured: the document
           moved 8972 -> 9689 with zero scroll events - so alpha stayed 0,
           cur never approached tgt and NOTHING was ever written to style.
           The parallax looked perfectly wired and was inert. Stamp from the
           frame clock instead, so whoever drives the scroll, the maths
           advances. The 2ms guard keeps one frame on one coefficient. */
        var tNow = clock();
        if (!lastT || (tNow - lastT) > 2) stampFrame();

        it.tgt = (p - 0.5) * it.travel;

        var d = it.tgt - it.cur;
        it.cur += d * alpha;

        /* SGMotion parks its rAF loop after 5 motionless frames, and it culls
           anything 300px past the viewport, so a callback can be the last one
           for a while — or the first after a hash jump or scroll restoration.
           Clamping the lag bounds what a freeze can leave on screen to 12% of
           travel, and turns a discontinuity into a snap instead of a slide. */
        var cap = it.travel * LAG_CAP;
        d = it.tgt - it.cur;
        if (d > cap) it.cur = it.tgt - cap;
        else if (d < -cap) it.cur = it.tgt + cap;
        else if (d < 0.01 && d > -0.01) it.cur = it.tgt;

        paint(it, false);

        /* will-change only while the layer is actually inside its travel */
        var live = (p > 0 && p < 1);
        if (live !== it.live) {
            it.live = live;
            it.layer.style.willChange = live ? 'transform' : '';
        }
    }

    function attach(box, layer) {
        var it = {
            layer: layer,
            travel: overscan(layer) * RATIO,
            cur: 0, tgt: 0, applied: null, live: false
        };
        items.push(it);
        SG.track(box, function (p) { follow(it, p); });
    }

    function build() {
        var i, j, list, box, img, layer;

        for (i = 0; i < CLIPS.length; i++) {
            list = doc.querySelectorAll(CLIPS[i]);
            for (j = 0; j < list.length; j++) {
                box = list[j];
                img = box.querySelector('img');
                if (!img || !img.parentNode) continue;

                layer = img.parentNode;
                if (!hasC(layer, 'sg-plx-box')) {
                    layer = doc.createElement('div');
                    layer.className = 'sg-plx-box';
                    img.parentNode.insertBefore(layer, img);
                    layer.appendChild(img);
                }
                addC(img, 'sg-plx-img');
                attach(box, layer);
            }
        }

        for (i = 0; i < BANDS.length; i++) {
            list = doc.querySelectorAll(BANDS[i][0]);
            for (j = 0; j < list.length; j++) {
                layer = list[j].querySelector(BANDS[i][1]);
                if (layer) attach(list[j], layer);
            }
        }
    }

    /* one clock read per frame, taken in the onScroll pass that runs AFTER
       every track callback — so the coefficient is ready for the next frame
       and no callback pays for a timestamp of its own */
    function stampFrame() {
        var t = clock();
        var dt = lastT ? (t - lastT) / 1000 : 0.0167;
        lastT = t;
        if (dt < 0) dt = 0; else if (dt > 0.1) dt = 0.1;
        alpha = 1 - Math.exp(-dt / TAU);
        if (alpha > 1) alpha = 1;
    }

    function remeasure() {
        for (var i = 0; i < items.length; i++) {
            items[i].travel = overscan(items[i].layer) * RATIO;
        }
    }

    /* the OS setting flipped while the page was open */
    function halt(on) {
        if (halted === on) return;
        halted = on;
        var i;
        if (on) {
            delC(html, ARM);
            for (i = 0; i < items.length; i++) {
                items[i].layer.style.transform = '';
                items[i].layer.style.willChange = '';
                items[i].applied = null;
                items[i].cur = items[i].tgt = 0;
                items[i].live = false;
            }
        } else {
            addC(html, ARM);
            lastT = 0;
            remeasure();
        }
        if (SG && typeof SG.refresh === 'function') SG.refresh();
    }

    function boot() {
        SG = win.SGMotion;
        if (!SG || typeof SG.track !== 'function') return;   /* no engine, no parallax */
        if (SG.reduced) return;                              /* nothing built at all */
        if (!doc.querySelectorAll || !supported()) return;

        addC(html, ARM);
        build();
        if (!items.length) { delC(html, ARM); return; }

        if (typeof SG.onScroll === 'function') SG.onScroll(stampFrame);
        if (typeof SG.onResize === 'function') SG.onResize(remeasure);

        var mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
        if (mq) {
            if (mq.addEventListener) {
                mq.addEventListener('change', function (ev) { halt(!!ev.matches); });
            } else if (mq.addListener) {
                mq.addListener(function (ev) { halt(!!ev.matches); });
            }
        }

        /* the wrappers are absolutely positioned and change no flow height, but
           the engine measured the page before they existed */
        if (typeof SG.refresh === 'function') SG.refresh();

        win.SGParallax = { count: items.length, refresh: remeasure };
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', boot, false);
    } else {
        boot();
    }
})(window, document);
