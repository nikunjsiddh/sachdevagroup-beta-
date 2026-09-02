/* ==========================================================================
   SACHDEVA GROUP — CERTIFICATE STRIP + DOCUMENT VIEWER
   ==========================================================================
   Loaded on index.html only, immediately BEFORE js/marine.js.

   IT OWNS TWO THINGS

   1. THE #credentials STRIP
      The band auto-scrolls, and it is a real horizontally-scrollable element
      while it does. One mechanism — native `scrollLeft`, advanced by rAF —
      instead of the two the page used to carry:

        before, prefers-reduced-motion: no-preference
          js/motion.js credentials() doubled the track with innerHTML and ran
          gsap.to(track, {xPercent:-50}). A transform marquee: no swipe, no
          keyboard scroll, and a moving click target on touch.
        before, prefers-reduced-motion: reduce
          motion.js never reached credentials() at all (its mm context calls a
          different, shorter branch), so the track was never doubled and never
          animated, css/marine.css:294-301 clamped every animation-duration to
          .001ms !important, and css/index-theme.css turned .mrn-certs into an
          `overflow-x: auto` scroll region. Net effect on a reduce-motion
          machine — which is what the site owner runs — a dead strip with a
          native scrollbar under it and no motion at all.

      Native scroll fixes both at once. Touch swipe, trackpad, shift-wheel and
      keyboard arrows all work for free, the auto-advance is the same property
      the user drags, and there is nothing to reconcile between the two.

      REDUCED MOTION is honoured as *reduced*, not *removed*: SPEED_REDUCED is
      a little under half SPEED_FULL, the scroll-velocity coupling is switched
      off, and the visible pause control below is how a visitor stops it for
      good. Set STRICT_REDUCED_MOTION = true to go back to never auto-advancing
      under the preference; everything else keeps working.

      WCAG 2.2.2 (Pause, Stop, Hide): the strip starts moving on its own and
      runs for longer than five seconds, so a *visible* control is required —
      hover and focus pausing does not satisfy it, and neither reaches a touch
      user. The button is built here rather than in the markup so the control
      can never be present without the script that honours it. The choice is
      remembered in localStorage.

   2. THE DOCUMENT VIEWER
      Clicking any plate opens the scan full-screen. These are A4 compliance
      documents (1240x1754, one at 3307x4680), not photographs, so the viewer
      is built to be READ: fit-the-page by default, one tap to zoom to a
      legible width, drag to pan, and swipe or arrow keys to move between them.

      NOT js/marine-pages.js initLightbox(): that file is not loaded on
      index.html, and loading it would drag in six other init functions plus
      css/marine-pages.css, which restyles selectors this page already uses.
      Its .mrnp-lb is also photo-shaped — nav buttons pinned left and right sit
      on top of a portrait document at phone widths, and there is no zoom, so
      the fine print on an A4 scan is unreadable at 390px. Kept separate on
      purpose; the inner pages are untouched.

   DUPLICATE SCANS
      images/cert/ holds nine files but only five distinct documents
      (1=2, 3=4=7, 5=9). The strip still shows all nine plates — that is the
      page's own content and not this file's call — but the VIEWER lists each
      document once so paging through it does not show the same certificate
      three times and the counter tells the truth. The key is the declared
      label, NOT the src: the repeats are byte-identical files at different
      paths (1.jpg and 2.jpg have the same md5), so a src key sees nine
      distinct documents and dedupes nothing. Give five real scans five real
      labels and it becomes 9 of 9 on its own, with no change here.

   ORDERING
      This file must run BEFORE js/marine.js and js/card-fx.js. It clones the
      plates to make the loop seamless, and both of those bind their handlers
      by querying the DOM once on DOMContentLoaded — clone first and the tilt
      and the cursor ring bind to all of the plates, clone after and the copies
      are inert. Script order in index.html is the whole mechanism; the
      DOMContentLoaded listeners fire in the order they were registered.

      It also stamps data-sg-certs="own" on <html> at parse time, which is the
      flag js/motion.js credentials() checks before standing down. That has to
      happen before GSAP builds its matchMedia contexts, so it is done at the
      top of this IIFE and not on DOMContentLoaded.

   ES5 only, no dependencies — the same contract as js/marine.js.
   ========================================================================== */

(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       Configuration
       ---------------------------------------------------------------------- */

    var SPEED_FULL = 34;      /* px per second — ~1.5 plates per 10s at desktop */
    var SPEED_REDUCED = 15;   /* px per second under prefers-reduced-motion    */
    var STRICT_REDUCED_MOTION = false;
    var STORE_KEY = 'sg-certs-motion';

    /* the scroll-velocity coupling js/motion.js used to apply, kept because it
       is the band's character: the shelf speeds up as the page moves past it
       and settles back. Off under reduced motion. */
    var VELOCITY_MAX = 2.4;
    var VELOCITY_DIVISOR = 14;
    var VELOCITY_DECAY = 2.6;   /* units per second back toward zero */

    var doc = document;
    var win = window;
    var html = doc.documentElement;

    var reduced = !!(win.matchMedia &&
        win.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* Claim the band NOW, before GSAP exists, so motion.js stands down. */
    html.setAttribute('data-sg-certs', 'own');

    /* ----------------------------------------------------------------------
       Small helpers
       ---------------------------------------------------------------------- */

    function one(sel, ctx) { return (ctx || doc).querySelector(sel); }
    function all(sel, ctx) {
        return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));
    }
    function on(el, ev, fn, opts) { el.addEventListener(ev, fn, opts || false); }
    function off(el, ev, fn, opts) { el.removeEventListener(ev, fn, opts || false); }

    function store(key, value) {
        try {
            if (value === undefined) return win.localStorage.getItem(key);
            win.localStorage.setItem(key, value);
        } catch (e) { /* private mode, blocked storage — never fatal */ }
        return null;
    }

    function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

    function nowMs() {
        return (win.performance && win.performance.now)
            ? win.performance.now() : new Date().getTime();
    }

    /* ======================================================================
       PART 1 — THE STRIP
       ====================================================================== */

    function initStrip(band) {
        var scroller = one('.mrn-certs', band);
        var track = one('.mrn-certs__track', band);
        if (!scroller || !track) return null;

        var originals = all('.mrn-cert', track);
        if (!originals.length) return null;

        /* --- seamless loop ------------------------------------------------
           The period is ONE set of plates. For the wrap to be invisible there
           must always be a full set beyond the right edge of the viewport, so
           the set is repeated until the track is at least one set wider than
           the scroller. Nine plates are 2088px at desktop and 1458px at 767px,
           so this is normally a single extra copy — but it is computed rather
           than assumed, because a future edit that leaves three plates in the
           markup would otherwise tear at the seam.

           cloneNode, not `innerHTML +=`. Re-assigning innerHTML re-parses the
           originals too, which silently drops every listener already bound to
           them — the bug that leaves the certificate plates on this page with
           a dead hover tilt today, because js/motion.js doubles the track with
           innerHTML after js/marine.js has bound initTilt to it.
           ------------------------------------------------------------------ */

        var setWidth = 0;
        /* how far into the track the real, focusable plates start. One full
           set is cloned BEFORE them so a leftward flick has runway instead of
           slamming into scrollLeft 0 — a native scroller clamps there, and on
           a swipeable strip hitting a wall in one direction reads as broken. */
        var base = 0;

        function measureSet() {
            var w = 0;
            for (var i = 0; i < originals.length; i++) {
                var r = originals[i].getBoundingClientRect();
                var cs = win.getComputedStyle(originals[i]);
                w += r.width + (parseFloat(cs.marginRight) || 0) + (parseFloat(cs.marginLeft) || 0);
            }
            return w;
        }

        function makeClone(src) {
            var clone = src.cloneNode(true);
            clone.setAttribute('data-cert-clone', '1');
            /* copies are decoration: never announced, never tabbable, and never
               a second copy of the same label in the accessibility tree. The
               click handler is delegated, so they still open the viewer when
               tapped. */
            clone.setAttribute('aria-hidden', 'true');
            clone.setAttribute('tabindex', '-1');
            clone.removeAttribute('id');
            clone.removeAttribute('role');
            return clone;
        }

        function buildCopies() {
            /* remove any copies from a previous pass */
            all('.mrn-cert[data-cert-clone]', track).forEach(function (el) {
                track.removeChild(el);
            });

            setWidth = measureSet();
            if (setWidth <= 0) { base = 0; return; }

            /* one set of runway behind, and enough ahead to cover the viewport
               plus a full period. Computed rather than assumed: a future edit
               that leaves three plates in the markup would otherwise tear at
               the seam on a wide screen. */
            var ahead = 1 + Math.ceil(scroller.clientWidth / setWidth);
            var i, c;

            for (i = originals.length - 1; i >= 0; i--) {
                track.insertBefore(makeClone(originals[i]), track.firstChild);
            }
            base = setWidth;

            for (c = 0; c < ahead; c++) {
                for (i = 0; i < originals.length; i++) {
                    track.appendChild(makeClone(originals[i]));
                }
            }
        }

        buildCopies();

        /* --- pause / play control ----------------------------------------- */

        var wanted = store(STORE_KEY);
        var userPaused = wanted === 'paused' ||
            (wanted === null && reduced && STRICT_REDUCED_MOTION);

        var controls = doc.createElement('div');
        controls.className = 'mrn-certs__controls';

        var toggle = doc.createElement('button');
        toggle.type = 'button';
        toggle.className = 'mrn-certs__toggle';
        toggle.innerHTML =
            '<span class="mrn-certs__toggle-ico" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" class="ico-pause" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" focusable="false">' +
            '<path d="M9 5v14M15 5v14"/></svg>' +
            '<svg viewBox="0 0 24 24" class="ico-play" fill="currentColor" ' +
            'stroke="none" focusable="false"><path d="M8 5.2v13.6L19 12z"/></svg>' +
            '</span><span class="mrn-certs__toggle-txt"></span>';

        controls.appendChild(toggle);
        /* BEFORE the shelf, not after it. A keyboard or screen-reader user has to
           meet the stop control before they meet the moving content, or the
           mechanism WCAG 2.2.2 asks for sits behind the thing it exists to
           stop. */
        scroller.parentNode.insertBefore(controls, scroller);

        function paintToggle() {
            /* The edge mask fades whatever sits at the ends of the shelf, which
               is right while the band is moving and wrong the moment someone
               stops it to read — the plate they stopped on would be the one left
               half dissolved. Dropped on a deliberate pause only; the transient
               hover and off-screen holds keep it. */
            if (userPaused) { band.classList.add('mrn-certs-stopped'); }
            else { band.classList.remove('mrn-certs-stopped'); }

            toggle.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
            toggle.setAttribute('aria-label',
                userPaused ? 'Play the certificate strip' : 'Pause the certificate strip');
            toggle.className = 'mrn-certs__toggle' + (userPaused ? ' is-paused' : '');
            one('.mrn-certs__toggle-txt', toggle).textContent = userPaused ? 'Play' : 'Pause';
        }
        paintToggle();

        on(toggle, 'click', function () {
            userPaused = !userPaused;
            store(STORE_KEY, userPaused ? 'paused' : 'playing');
            paintToggle();
        });

        /* --- everything else that can hold the strip still ----------------- */

        var hovering = false;
        var focused = false;
        var onscreen = true;
        /* far enough in the past that the 1400ms settle below is already over
           at t=0 — performance.now() starts near zero on a fresh load, so a
           plain 0 here would hold the strip still for its first 1.4 seconds */
        var interacting = -100000;
        var viewerOpen = false;

        /* HOVER PAUSE ONLY WHERE HOVER IS REAL.
           Touch browsers synthesise mouseenter on tap and routinely never fire
           the matching mouseleave, so on a phone the first tap on a plate would
           freeze the shelf for the rest of the session — and a tap on a plate is
           now how the viewer is opened, so it would happen immediately, to
           everyone. The pointer query is the same gate js/marine.js initTilt and
           js/card-fx.js already use for this class of problem. */
        if (win.matchMedia && win.matchMedia('(hover: hover)').matches) {
            on(scroller, 'mouseenter', function () { hovering = true; });
            on(scroller, 'mouseleave', function () { hovering = false; });
        }
        on(scroller, 'focusin', function () { focused = true; });
        on(scroller, 'focusout', function () { focused = false; });

        function poke() { interacting = nowMs(); }
        on(scroller, 'pointerdown', poke, { passive: true });
        on(scroller, 'touchstart', poke, { passive: true });
        on(scroller, 'wheel', poke, { passive: true });
        on(scroller, 'keydown', poke);

        if ('IntersectionObserver' in win) {
            new win.IntersectionObserver(function (entries) {
                onscreen = entries[0].isIntersecting;
            }, { rootMargin: '120px 0px' }).observe(band);
        }

        /* document.hidden is read live inside running() rather than latched on
           a visibilitychange listener — one fewer thing to keep in sync */

        function running() {
            if (userPaused) return false;
            if (reduced && STRICT_REDUCED_MOTION) return false;
            if (hovering || focused || viewerOpen) return false;
            if (!onscreen || doc.hidden) return false;
            if (nowMs() - interacting < 1400) return false;
            return true;
        }

        /* --- the loop ------------------------------------------------------ */

        var pos = 0;
        var applied = 0;
        var last = 0;
        var raf = null;
        var boost = 0;
        var dir = band.getAttribute('data-cert-dir') === 'ltr' ? -1 : 1;

        /* Keep the offset inside one period, measured from `base` so the real
           plates are the ones on screen at rest and there is a whole set of
           runway on either side. Content at x and x + setWidth is identical, so
           the correction is invisible. */
        function wrap(v) {
            if (!setWidth) return v;
            var d = (v - base) % setWidth;
            if (d < 0) { d += setWidth; }
            return base + d;
        }

        function frame(t) {
            raf = win.requestAnimationFrame(frame);
            if (!last) { last = t; return; }

            var dt = Math.min(t - last, 60) / 1000;
            last = t;

            /* the user may have dragged, swiped or arrowed since the last
               frame — adopt whatever they did instead of fighting them */
            if (Math.abs(scroller.scrollLeft - applied) > 1.5) {
                pos = scroller.scrollLeft;
            }

            if (boost > 0) {
                boost = Math.max(0, boost - VELOCITY_DECAY * dt);
            }

            if (running() && setWidth > 0) {
                pos = wrap(pos + dir * (speed() * (1 + boost)) * dt);
                scroller.scrollLeft = pos;
            } else {
                var w = wrap(scroller.scrollLeft);
                if (Math.abs(w - scroller.scrollLeft) > 0.5) {
                    scroller.scrollLeft = w;
                }
                pos = w;
            }
            applied = scroller.scrollLeft;
        }

        function speed() { return reduced ? SPEED_REDUCED : SPEED_FULL; }

        /* scroll-velocity coupling, the character motion.js gave this band */
        if (!reduced) {
            var lastY = win.pageYOffset;
            on(win, 'scroll', function () {
                var y = win.pageYOffset;
                var d = Math.abs(y - lastY);
                lastY = y;
                if (!onscreen) return;
                boost = clamp(Math.max(boost, d / VELOCITY_DIVISOR), 0, VELOCITY_MAX);
            }, { passive: true });
        }

        pos = wrap(base);
        scroller.scrollLeft = pos;
        applied = scroller.scrollLeft;
        raf = win.requestAnimationFrame(frame);

        /* --- reflow --------------------------------------------------------
           Plate metrics are breakpoint-scoped custom properties, so a resize
           across 1200 / 991 / 767 changes setWidth and therefore the loop
           period. Rebuild rather than drift. Position is preserved as a
           fraction of the set so the strip does not jump. */

        var rt = null;
        on(win, 'resize', function () {
            win.clearTimeout(rt);
            rt = win.setTimeout(function () {
                var fraction = setWidth ? ((pos - base) / setWidth) : 0;
                buildCopies();
                pos = wrap(base + fraction * setWidth);
                scroller.scrollLeft = pos;
                applied = scroller.scrollLeft;
            }, 180);
        }, { passive: true });

        return {
            scroller: scroller,
            track: track,
            originals: originals,
            hold: function (state) { viewerOpen = state; }
        };
    }

    /* ======================================================================
       PART 2 — THE DOCUMENT VIEWER
       ====================================================================== */

    function initViewer(band, strip) {
        /* One entry per DISTINCT document, in the order the plates first use
           it. See DUPLICATE SCANS at the top of this file.

           KEYED ON THE LABEL, NOT ON src. The four repeats in images/cert/ are
           byte-identical files sitting at four different paths — 1.jpg and
           2.jpg have the same md5 — so a src key sees nine unique documents
           and pages through the same certificate three times while the counter
           claims progress. data-cert-title + data-cert-sub is the identity the
           markup actually declares, which is the thing worth trusting: give
           two plates different labels and they are two documents, whatever
           their filenames say. */
        var docs = [];
        var byKey = {};
        var indexOfTile = [];

        strip.originals.forEach(function (tile) {
            var img = one('img', tile);
            if (!img) { indexOfTile.push(-1); return; }

            var title = tile.getAttribute('data-cert-title') || '';
            var sub = tile.getAttribute('data-cert-sub') || '';
            /* the src is part of the key so an unlabelled strip still works —
               with no data-cert-* attributes this degrades to one entry per
               file, which is the old behaviour and never collapses anything */
            var key = (title || sub) ? (title + '\u0000' + sub) : img.getAttribute('src');

            if (!byKey.hasOwnProperty(key)) {
                byKey[key] = docs.length;
                docs.push({
                    src: img.getAttribute('src'),
                    title: title || 'Certificate',
                    sub: sub,
                    alt: img.getAttribute('alt') || 'Certificate'
                });
            }
            indexOfTile.push(byKey[key]);
        });

        if (!docs.length) return;

        /* the clones repeat the originals in order, so a tile's position in
           the track maps to a document by its index modulo the real count */
        function docIndexFor(tile) {
            var kids = strip.track.children;
            for (var i = 0; i < kids.length; i++) {
                if (kids[i] === tile) {
                    var n = indexOfTile[i % strip.originals.length];
                    return n === -1 ? null : n;
                }
            }
            return null;
        }

        /* --- make the plates operable -------------------------------------
           They are <div>s. Rather than change nine elements in the markup and
           the CSS that sizes them, they are promoted here — the same approach
           js/marine-pages.js takes for the gallery tiles. Only the originals
           get a tab stop; the clones are aria-hidden decoration. */

        strip.originals.forEach(function (tile, i) {
            var d = docs[indexOfTile[i]];
            tile.setAttribute('role', 'button');
            tile.setAttribute('tabindex', '0');
            tile.setAttribute('aria-haspopup', 'dialog');
            if (!tile.getAttribute('aria-label')) {
                tile.setAttribute('aria-label', 'View certificate: ' + (d ? d.title : ('' + (i + 1))));
            }
        });

        /* Delegated, so it covers the clones and survives any future rebuild
           of the track without re-binding. */
        function tileFrom(node) {
            while (node && node !== strip.track) {
                if (node.classList && node.classList.contains('mrn-cert')) return node;
                node = node.parentNode;
            }
            return null;
        }

        /* A FLICK IS NOT A CLICK.
           The shelf is a native horizontal scroller now, so a visitor swiping it
           on a phone — or dragging it with a mouse — ends every gesture with a
           click event on whichever plate happens to be under the finger. Without
           a movement threshold that opens a certificate nobody asked for at the
           end of every swipe. 8px of travel, or a press longer than 700ms, and
           the gesture was a scroll. */
        var pressX = 0, pressY = 0, pressT = 0, pressed = false;

        on(strip.track, 'pointerdown', function (e) {
            pressed = true;
            pressX = e.clientX;
            pressY = e.clientY;
            pressT = nowMs();
        }, { passive: true });

        on(strip.track, 'pointercancel', function () { pressed = false; }, { passive: true });

        function wasDrag(e) {
            if (!pressed) return false;
            var dx = Math.abs(e.clientX - pressX);
            var dy = Math.abs(e.clientY - pressY);
            return (dx > 8 || dy > 8) || (nowMs() - pressT > 700);
        }

        on(strip.track, 'click', function (e) {
            var drag = wasDrag(e);
            pressed = false;
            if (drag) return;

            var tile = tileFrom(e.target);
            if (!tile) return;
            var idx = docIndexFor(tile);
            if (idx === null) return;
            e.preventDefault();
            open(idx, tile);
        });

        on(strip.track, 'keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            var tile = tileFrom(e.target);
            if (!tile) return;
            var idx = docIndexFor(tile);
            if (idx === null) return;
            e.preventDefault();
            open(idx, tile);
        });

        /* --- the dialog, built on first open ------------------------------- */

        var box = null;
        var stage = null;
        var imgEl = null;
        var titleEl = null;
        var subEl = null;
        var countEl = null;
        var openBtn = null;
        var zoomBtn = null;
        var current = 0;
        var zoomed = false;
        var loadToken = 0;
        var returnTo = null;
        var lockedScrollbar = 0;
        var lockedScrollY = 0;

        function build() {
            box = doc.createElement('div');
            box.className = 'sgcv';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            box.setAttribute('aria-label', 'Certificate viewer');
            box.hidden = true;
            box.innerHTML =
                '<div class="sgcv__scrim" data-sgcv-close></div>' +
                '<div class="sgcv__panel">' +
                '<div class="sgcv__bar">' +
                '<div class="sgcv__id">' +
                '<p class="sgcv__title"></p>' +
                '<p class="sgcv__sub"></p>' +
                '</div>' +
                '<div class="sgcv__tools">' +
                '<button type="button" class="sgcv__btn sgcv__zoom" aria-pressed="false">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
                'stroke-linecap="round" aria-hidden="true" focusable="false">' +
                '<circle cx="10.6" cy="10.6" r="6.6"/><path d="M15.5 15.5 21 21"/>' +
                '<path d="M10.6 7.9v5.4M7.9 10.6h5.4" class="sgcv__plus"/></svg>' +
                '<span class="sgcv__btn-txt">Zoom</span></button>' +
                '<a class="sgcv__btn sgcv__open" target="_blank" rel="noopener noreferrer">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
                'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
                '<path d="M13.5 4.5H19.5V10.5"/><path d="M19.5 4.5 11 13"/>' +
                '<path d="M18 14.4v4.1a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4.1"/></svg>' +
                '<span class="sgcv__btn-txt">Full size</span></a>' +
                '<button type="button" class="sgcv__btn sgcv__close" aria-label="Close viewer">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round" aria-hidden="true" focusable="false">' +
                '<path d="M6 6l12 12M18 6 6 18"/></svg>' +
                '<span class="sgcv__btn-txt sgcv__btn-txt--hide">Close</span></button>' +
                '</div></div>' +
                '<div class="sgcv__stage" tabindex="0">' +
                '<img class="sgcv__img" alt="" draggable="false" ' +
                'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">' +
                '</div>' +
                '<div class="sgcv__foot">' +
                '<button type="button" class="sgcv__nav sgcv__prev" aria-label="Previous certificate">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
                '<path d="M14.5 5.5 8 12l6.5 6.5"/></svg></button>' +
                '<p class="sgcv__count" role="status" aria-live="polite"></p>' +
                '<button type="button" class="sgcv__nav sgcv__next" aria-label="Next certificate">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
                '<path d="M9.5 5.5 16 12l-6.5 6.5"/></svg></button>' +
                '</div></div>';

            doc.body.appendChild(box);

            stage = one('.sgcv__stage', box);
            imgEl = one('.sgcv__img', box);
            titleEl = one('.sgcv__title', box);
            subEl = one('.sgcv__sub', box);
            countEl = one('.sgcv__count', box);
            openBtn = one('.sgcv__open', box);
            zoomBtn = one('.sgcv__zoom', box);

            on(one('.sgcv__close', box), 'click', close);
            on(one('.sgcv__prev', box), 'click', function () { show(current - 1); });
            on(one('.sgcv__next', box), 'click', function () { show(current + 1); });
            on(zoomBtn, 'click', function () { setZoom(!zoomed); });

            on(box, 'click', function (e) {
                if (e.target.hasAttribute && e.target.hasAttribute('data-sgcv-close')) close();
            });

            /* double-click / double-tap toggles zoom, the gesture every
               document reader uses */
            on(stage, 'dblclick', function (e) { e.preventDefault(); setZoom(!zoomed, e); });

            wireGestures();
            on(imgEl, 'load', onImgLoad);
            on(imgEl, 'error', function () { box.classList.add('is-failed'); });
        }

        /* --- sizing --------------------------------------------------------
           Two states, because a document only has two useful ones.

             fit   the whole page on screen. The <img> is max-width/max-height
                   bound inside the stage, so a 1240x1754 portrait scan is
                   height-bound on every landscape viewport and width-bound on
                   a phone in portrait. Nothing is cropped, ever.
             zoom  the scan at a width chosen to make body text legible, and
                   the stage scrolls. 1240px of an A4 scan on a 390px phone is
                   3.2x, which is the difference between "there is small print"
                   and being able to read the certificate number.

           The zoom width is set from JS because CSS cannot read naturalWidth,
           and it is capped so images/cert/6.jpg (3307px wide) does not open at
           2.7x the useful size and force a long pan to find the middle. */

        function zoomWidth() {
            var natural = imgEl.naturalWidth || 1240;
            var stageW = stage.clientWidth || 360;

            /* Wanted: 2.6x the width the page gets in fit mode, and never less
               than 1100px — on a 390px phone the stage is ~366px, so 2.6x is
               only 952px and the certificate number is still marginal. 1100 of
               an A4 scan's 1240 native pixels is where the small print under
               the signature becomes readable.

               Capped at what the file actually has, so a 1240px scan is never
               upscaled into mush, and then at 1600 so images/cert/6.jpg
               (3307px wide) does not open at 2.7x the useful size and force a
               long pan just to find the middle of the page.

               The stageW * 1.3 floor runs underneath both caps: on a very tall
               window the fit view can already be wider than the natural cap,
               and without it "Zoom" would make the document smaller. */
            var floor = stageW * 1.3;
            var want = Math.max(stageW * 2.6, 1100, floor);

            return Math.round(Math.min(want, Math.max(natural, floor), 1600));
        }

        function setZoom(state, ev) {
            /* Where the reader was looking, as a fraction of the page, measured
               BEFORE the resize. Zooming from the stage centre throws someone
               off the line they were reading the moment they double-tap a seal
               or a certificate number — the one gesture that says "this bit". */
            var was = imgEl.getBoundingClientRect();
            var sr = stage.getBoundingClientRect();
            var fx = 0.5, fy = 0;
            var anchorX = stage.clientWidth / 2, anchorY = 0;

            if (ev && was.width > 0 && was.height > 0) {
                fx = clamp((ev.clientX - was.left) / was.width, 0, 1);
                fy = clamp((ev.clientY - was.top) / was.height, 0, 1);
                anchorX = ev.clientX - sr.left;
                anchorY = ev.clientY - sr.top;
            }

            zoomed = !!state;
            /* add/remove rather than toggle(class, force): the two-argument
               form of classList.toggle is ignored by some of the browsers this
               codebase still targets, which would invert the state instead of
               setting it */
            if (zoomed) { box.classList.add('is-zoomed'); }
            else { box.classList.remove('is-zoomed'); }
            zoomBtn.setAttribute('aria-pressed', zoomed ? 'true' : 'false');
            one('.sgcv__btn-txt', zoomBtn).textContent = zoomed ? 'Fit' : 'Zoom';

            if (zoomed) {
                imgEl.style.width = zoomWidth() + 'px';
                /* offsetLeft/Top are in the stage's own scroll coordinates —
                   the stage is position:relative, so it is the offsetParent —
                   which is exactly the space scrollLeft/scrollTop live in.
                   With no pointer to anchor to this reduces to centred
                   horizontally and at the top of the page, where the letterhead
                   is and where reading starts. */
                stage.scrollLeft = imgEl.offsetLeft + fx * imgEl.offsetWidth - anchorX;
                stage.scrollTop = imgEl.offsetTop + fy * imgEl.offsetHeight - anchorY;
            } else {
                imgEl.style.width = '';
                stage.scrollLeft = 0;
                stage.scrollTop = 0;
            }
        }

        function onImgLoad() {
            /* one class per call — the variadic form of classList.remove is
               not universal in the browser set this codebase targets */
            box.classList.remove('is-loading');
            box.classList.remove('is-failed');
            if (zoomed) setZoom(true);
        }

        /* --- gestures: swipe to page, drag to pan when zoomed --------------- */

        function wireGestures() {
            var sx = 0, sy = 0, sl = 0, st = 0, down = false, moved = false;

            on(stage, 'pointerdown', function (e) {
                if (e.button && e.button !== 0) return;
                down = true; moved = false;
                sx = e.clientX; sy = e.clientY;
                sl = stage.scrollLeft; st = stage.scrollTop;
                if (zoomed && stage.setPointerCapture) {
                    try { stage.setPointerCapture(e.pointerId); } catch (err) { }
                }
            });

            on(stage, 'pointermove', function (e) {
                if (!down) return;
                var dx = e.clientX - sx;
                var dy = e.clientY - sy;
                if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
                if (!zoomed) return;
                e.preventDefault();
                stage.scrollLeft = sl - dx;
                stage.scrollTop = st - dy;
            });

            function up(e) {
                if (!down) return;
                down = false;
                if (zoomed || !moved) return;
                var dx = e.clientX - sx;
                var dy = e.clientY - sy;
                /* a horizontal flick of at least 56px that is mostly
                   horizontal pages; anything else is ignored */
                if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) {
                    show(current + (dx < 0 ? 1 : -1));
                }
            }
            on(stage, 'pointerup', up);
            on(stage, 'pointercancel', function () { down = false; });
        }

        /* --- focus trap ---------------------------------------------------- */

        function focusables() {
            return all('button:not([disabled]), a[href], [tabindex="0"]', box)
                .filter(function (el) { return el.offsetParent !== null; });
        }

        function onKey(e) {
            if (box.hidden) return;

            if (e.key === 'Escape') { e.preventDefault(); close(); return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); return; }
            if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); return; }
            if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(true); return; }
            if (e.key === '-') { e.preventDefault(); setZoom(false); return; }

            if (e.key !== 'Tab') return;

            var list = focusables();
            if (!list.length) return;
            var first = list[0];
            var lastEl = list[list.length - 1];

            if (e.shiftKey && doc.activeElement === first) {
                e.preventDefault(); lastEl.focus();
            } else if (!e.shiftKey && doc.activeElement === lastEl) {
                e.preventDefault(); first.focus();
            }
        }

        /* --- open / show / close -------------------------------------------- */

        function preload(i) {
            var d = docs[(i + docs.length) % docs.length];
            if (!d) return;
            var pre = new Image();
            pre.src = d.src;
        }

        function show(i) {
            current = (i + docs.length) % docs.length;
            var d = docs[current];

            /* Load into a detached Image first and only swap the visible one
               once the bytes are in. Assigning src directly blanks the frame
               while the next scan downloads, and images/cert/6.jpg is 632KB —
               on a phone that is a second of empty viewer. This way the
               previous certificate stays up, dimmed under the spinner, until
               the new one can replace it in a single paint.

               The token guards the race: page quickly through five documents
               and four of these callbacks are stale by the time they fire. */
            var token = ++loadToken;
            box.classList.add('is-loading');
            box.classList.remove('is-failed');

            if (imgEl.getAttribute('src') === d.src) {
                box.classList.remove('is-loading');
            } else {
                var probe = new Image();
                probe.onload = function () {
                    if (token !== loadToken) return;
                    imgEl.setAttribute('src', d.src);
                    imgEl.setAttribute('alt', d.alt);
                    /* a cached decode may not re-fire load on the visible node */
                    if (imgEl.complete) onImgLoad();
                };
                probe.onerror = function () {
                    if (token !== loadToken) return;
                    box.classList.remove('is-loading');
                    box.classList.add('is-failed');
                };
                probe.src = d.src;
            }

            titleEl.textContent = d.title;
            subEl.textContent = d.sub;
            subEl.hidden = !d.sub;
            countEl.textContent = (current + 1) + ' of ' + docs.length;
            openBtn.setAttribute('href', d.src);
            openBtn.setAttribute('aria-label', 'Open ' + d.title + ' at full size in a new tab');

            /* a one-document strip has nothing to page to */
            var solo = docs.length < 2;
            one('.sgcv__foot', box).hidden = solo;

            if (!solo) { preload(current + 1); preload(current - 1); }
        }

        function open(i, trigger) {
            if (!box) build();
            returnTo = trigger || null;
            lockedScrollY = win.pageYOffset;

            lockedScrollbar = win.innerWidth - html.clientWidth;
            if (lockedScrollbar > 0) {
                doc.body.style.paddingRight = lockedScrollbar + 'px';
            }
            html.classList.add('sgcv-lock');

            strip.hold(true);
            zoomed = false;
            box.classList.remove('is-zoomed');
            imgEl.style.width = '';

            box.hidden = false;
            /* one frame so the transition has a start state to run from */
            win.requestAnimationFrame(function () { box.classList.add('is-open'); });

            show(i);
            on(doc, 'keydown', onKey, true);
            one('.sgcv__close', box).focus();
        }

        function close() {
            box.classList.remove('is-open');
            off(doc, 'keydown', onKey, true);
            html.classList.remove('sgcv-lock');
            doc.body.style.paddingRight = '';
            strip.hold(false);

            /* overflow:hidden on the scrolling element preserves the offset in
               every engine that matters, but a couple of mobile browsers drop
               it — and landing back at the top of a very long homepage instead
               of at the certificate strip is a bad enough failure to be worth
               two lines. Only corrected if it actually moved. */
            if (Math.abs(win.pageYOffset - lockedScrollY) > 2) {
                win.scrollTo(0, lockedScrollY);
            }

            /* The body carried a scrollbar-width padding while the viewer was
               open, so every ScrollTrigger on the page measured against a
               slightly narrower body. Hand the real numbers back. */
            if (win.ScrollTrigger && win.ScrollTrigger.refresh) {
                win.ScrollTrigger.refresh();
            }

            /* wait out the fade, then take it out of the a11y tree */
            win.setTimeout(function () {
                box.hidden = true;
                /* free the decoded bitmap; the strip keeps its own thumbnails */
                imgEl.setAttribute('src',
                    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
            }, reduced ? 0 : 260);

            if (returnTo && returnTo.focus) returnTo.focus();
            returnTo = null;
        }
    }

    /* ======================================================================
       Boot
       ====================================================================== */

    function boot() {
        var band = doc.getElementById('credentials');
        if (!band) return;

        var strip = initStrip(band);
        if (!strip) return;

        band.classList.add('mrn-certs-live');
        initViewer(band, strip);
    }

    if (doc.readyState === 'loading') {
        on(doc, 'DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
