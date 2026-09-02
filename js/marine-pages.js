/* ==========================================================================
   MARINE PAGES — interaction layer for inner pages
   Depends on nothing. Loads after js/marine.js (which owns reveal/counters/
   parallax/tilt on .mrn-* elements). This file owns the .mrnp-* components.
   ========================================================================== */
(function () {
    'use strict';

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function each(list, fn) { Array.prototype.forEach.call(list, fn); }

    /* ------------------------------------------------------------------
       1. True 3D tilt — children with translateZ lift off the card face
    ------------------------------------------------------------------ */
    function initTilt3d() {
        /* Not gated on prefers-reduced-motion — same reasoning as
           js/marine.js initTilt, which carries the argument in full. Every
           other handler in this file still honours it. */
        if (window.matchMedia('(pointer: coarse)').matches) return;

        each(document.querySelectorAll('[data-mrnp-tilt]'), function (el) {
            var max = parseFloat(el.getAttribute('data-mrnp-tilt')) || 9;
            var raf = null;

            el.addEventListener('mousemove', function (e) {
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    var r = el.getBoundingClientRect();
                    var px = (e.clientX - r.left) / r.width - 0.5;
                    var py = (e.clientY - r.top) / r.height - 0.5;
                    /* see js/marine.js initTilt for why this is
                       !important: reduced-motion blocks in eight stylesheets
                       set `transform: none !important` on these cards. */
                    el.style.setProperty('transform',
                        'perspective(1000px) rotateY(' + (px * max) + 'deg) rotateX(' + (-py * max) +
                        'deg) translateY(-6px)', 'important');
                    raf = null;
                });
            });

            el.addEventListener('mouseleave', function () {
                el.style.removeProperty('transform');
            });
        });
    }

    /* ------------------------------------------------------------------
       2. Accordion
    ------------------------------------------------------------------ */
    function initAccordion() {
        each(document.querySelectorAll('.mrnp-acc'), function (acc) {
            var single = acc.hasAttribute('data-mrnp-single');

            each(acc.querySelectorAll('.mrnp-acc__head'), function (head) {
                var item = head.closest('.mrnp-acc__item');
                var panel = item.querySelector('.mrnp-acc__panel');

                head.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');
                if (item.classList.contains('is-open')) panel.style.maxHeight = panel.scrollHeight + 'px';

                head.addEventListener('click', function () {
                    var willOpen = !item.classList.contains('is-open');

                    if (single && willOpen) {
                        each(acc.querySelectorAll('.mrnp-acc__item.is-open'), function (other) {
                            other.classList.remove('is-open');
                            other.querySelector('.mrnp-acc__panel').style.maxHeight = null;
                            other.querySelector('.mrnp-acc__head').setAttribute('aria-expanded', 'false');
                        });
                    }

                    item.classList.toggle('is-open', willOpen);
                    head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                    panel.style.maxHeight = willOpen ? panel.scrollHeight + 'px' : null;
                });
            });
        });

        // keep open panels correctly sized when the viewport reflows
        window.addEventListener('resize', function () {
            each(document.querySelectorAll('.mrnp-acc__item.is-open .mrnp-acc__panel'), function (p) {
                p.style.maxHeight = p.scrollHeight + 'px';
            });
        });
    }

    /* ------------------------------------------------------------------
       3. Lightbox for galleries and certificates

       A framed viewer, not a bare image on a scrim. The frame is measured
       to the picture — layout() sets the frame's width and the stage's
       height from the image's natural ratio — so the title bar and the
       thumbnail rail align with the photo's own edges. Previously the nav
       arrows were pinned to the VIEWPORT, which put them on top of the
       image (1177px of picture inside 1280px of window) and left the
       caption every trigger already carries unused.

       One viewer serves two very different sets: the 16:9 yard photos on
       gallery.html and the portrait A4 certificate scans on about_us.html
       and our_credentials.html. The scans fit to roughly 350px wide on a
       laptop, so the stage zooms — a document you cannot read is not a
       document.
    ------------------------------------------------------------------ */
    function initLightbox() {
        var triggers = document.querySelectorAll('[data-mrnp-lightbox]');
        if (!triggers.length) return;

        /* These four mirror css/marine-pages.css section 8. FULL_BLEED is the
           breakpoint where the frame is dropped for a full-screen viewer, and
           below it layout() writes nothing. */
        var MAX_W = 1240;
        var MIN_W = 300;
        var PAD_X = 40, PAD_Y = 34;
        var FULL_BLEED = 860;
        var ZOOM = 2.2;

        var SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
            'aria-hidden="true" focusable="false"';
        var ICON = {
            close: '<svg ' + SVG + '><line x1="6" y1="6" x2="18" y2="18"></line>' +
                '<line x1="18" y1="6" x2="6" y2="18"></line></svg>',
            prev: '<svg ' + SVG + '><polyline points="15 5 8 12 15 19"></polyline></svg>',
            next: '<svg ' + SVG + '><polyline points="9 5 16 12 9 19"></polyline></svg>',
            zoomIn: '<svg ' + SVG + '><circle cx="11" cy="11" r="7"></circle>' +
                '<line x1="20" y1="20" x2="16.65" y2="16.65"></line>' +
                '<line x1="11" y1="8" x2="11" y2="14"></line>' +
                '<line x1="8" y1="11" x2="14" y2="11"></line></svg>',
            zoomOut: '<svg ' + SVG + '><circle cx="11" cy="11" r="7"></circle>' +
                '<line x1="20" y1="20" x2="16.65" y2="16.65"></line>' +
                '<line x1="8" y1="11" x2="14" y2="11"></line></svg>'
        };

        var shots = [];
        each(triggers, function (t, i) {
            var img = t.querySelector('img');
            var full = t.getAttribute('data-mrnp-lightbox') || (img ? img.getAttribute('src') : '');
            shots.push({
                src: full,
                /* the grid tile is already decoded and in cache — reuse it for
                   the rail rather than pulling six full-size files */
                thumb: (img ? img.getAttribute('src') : '') || full,
                cap: t.getAttribute('data-mrnp-caption') || (img ? img.getAttribute('alt') : '') || ''
            });
            t.setAttribute('data-mrnp-index', i);
        });

        function pad(n) { return (n < 10 ? '0' : '') + n; }

        var box = document.createElement('div');
        box.className = 'mrnp-lb' + (shots.length < 2 ? ' mrnp-lb--single' : '');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', 'Image viewer');
        box.setAttribute('aria-hidden', 'true');
        box.innerHTML =
            '<div class="mrnp-lb__scrim"></div>' +
            '<div class="mrnp-lb__frame">' +
            '<div class="mrnp-lb__bar">' +
            '<div class="mrnp-lb__meta">' +
            '<span class="mrnp-lb__idx"></span>' +
            '<span class="mrnp-lb__title"></span>' +
            '</div>' +
            '<div class="mrnp-lb__tools">' +
            '<span class="mrnp-lb__count"></span>' +
            '<button type="button" class="mrnp-lb__btn mrnp-lb__zoom" aria-label="Zoom in">' +
            ICON.zoomIn + '</button>' +
            '<button type="button" class="mrnp-lb__btn mrnp-lb__close" aria-label="Close viewer">' +
            ICON.close + '</button>' +
            '</div>' +
            '</div>' +
            '<div class="mrnp-lb__stage">' +
            '<div class="mrnp-lb__canvas">' +
            /* transparent placeholder: a src-less <img> sits in the DOM as a
               broken image on every page until the viewer is first opened */
            '<img class="mrnp-lb__img" alt="" ' +
            'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">' +
            '</div>' +
            '<span class="mrnp-lb__spin"></span>' +
            '<button type="button" class="mrnp-lb__nav mrnp-lb__nav--prev" aria-label="Previous image">' +
            ICON.prev + '</button>' +
            '<button type="button" class="mrnp-lb__nav mrnp-lb__nav--next" aria-label="Next image">' +
            ICON.next + '</button>' +
            '</div>' +
            '<div class="mrnp-lb__foot"><div class="mrnp-lb__rail"></div></div>' +
            '</div>';
        document.body.appendChild(box);

        var frame = box.querySelector('.mrnp-lb__frame');
        var bar = box.querySelector('.mrnp-lb__bar');
        var foot = box.querySelector('.mrnp-lb__foot');
        var stage = box.querySelector('.mrnp-lb__stage');
        var canvas = box.querySelector('.mrnp-lb__canvas');
        var imgEl = box.querySelector('.mrnp-lb__img');
        var idxEl = box.querySelector('.mrnp-lb__idx');
        var titleEl = box.querySelector('.mrnp-lb__title');
        var countEl = box.querySelector('.mrnp-lb__count');
        var zoomBtn = box.querySelector('.mrnp-lb__zoom');
        var closeBtn = box.querySelector('.mrnp-lb__close');
        var rail = box.querySelector('.mrnp-lb__rail');

        var thumbs = [];
        if (shots.length > 1) {
            each(shots, function (s, i) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'mrnp-lb__thumb';
                b.setAttribute('aria-label', 'Show image ' + (i + 1) +
                    (s.cap ? ': ' + s.cap : ''));

                /* setAttribute rather than an innerHTML string: s.thumb is a
                   path read back out of the page's own markup, and there is no
                   reason to send it through the HTML parser to get it back */
                var ti = document.createElement('img');
                ti.setAttribute('src', s.thumb);
                ti.setAttribute('alt', '');
                ti.setAttribute('loading', 'lazy');
                b.appendChild(ti);

                b.addEventListener('click', function () { show(i); });
                rail.appendChild(b);
                thumbs.push(b);
            });
        }

        var current = 0;
        var lastFocus = null;
        var prevOverflow = '', prevPadRight = '';

        /* ---- sizing --------------------------------------------------- */

        function layout() {
            if (window.innerWidth <= FULL_BLEED) {
                frame.style.width = '';
                stage.style.height = '';
                return;
            }
            var nw = imgEl.naturalWidth, nh = imgEl.naturalHeight;
            if (!nw || !nh) return;

            /* Twice, because the two measurements feed each other: the footer
               is 10px taller when the rail overflows, and whether it overflows
               depends on the frame width this is trying to work out. Pass one
               reads the chrome at the OLD width, so a viewer stepping from a
               narrow image to a wide one sizes off a scrollbar that is about
               to disappear. Pass two reads it at the width pass one set, and
               the pair converges. Only runs on open, image change and resize. */
            for (var pass = 0; pass < 2; pass++) {
                var availW = Math.min(window.innerWidth - PAD_X * 2, MAX_W);
                /* -2 for the frame's own top and bottom border */
                var availH = window.innerHeight - PAD_Y * 2 -
                    bar.offsetHeight - foot.offsetHeight - 2;

                var w = Math.min(availW, nw);
                var h = w * nh / nw;
                if (h > availH) {
                    h = availH;
                    w = h * nw / nh;
                }
                /* A portrait scan can fit to under 300px, which is narrower
                   than the title bar's own controls. Widen the frame and let
                   the stage letterbox — the picture is the same size either
                   way. */
                frame.style.width = Math.max(Math.round(w), MIN_W) + 'px';
                stage.style.height = Math.max(Math.round(h), 160) + 'px';
            }
        }

        /* ---- zoom ----------------------------------------------------- */

        function fitsWhole() {
            return imgEl.naturalWidth <= imgEl.getBoundingClientRect().width + 24;
        }

        function zoomed() { return canvas.className.indexOf('is-zoomed') > -1; }

        function setZoom(on, ox, oy) {
            if (on && fitsWhole()) return;

            if (on) {
                var r = imgEl.getBoundingClientRect();
                var fx = r.width ? ((ox === undefined ? r.left + r.width / 2 : ox) - r.left) / r.width : .5;
                var fy = r.height ? ((oy === undefined ? r.top + r.height / 2 : oy) - r.top) / r.height : .5;

                imgEl.style.width = Math.round(Math.min(imgEl.naturalWidth, r.width * ZOOM)) + 'px';
                imgEl.style.height = 'auto';
                canvas.classList.add('is-zoomed');

                /* hold the point under the cursor roughly where it was */
                canvas.scrollLeft = fx * imgEl.offsetWidth - canvas.clientWidth / 2;
                canvas.scrollTop = fy * imgEl.offsetHeight - canvas.clientHeight / 2;
            } else {
                imgEl.style.width = '';
                imgEl.style.height = '';
                canvas.classList.remove('is-zoomed');
                canvas.classList.remove('is-panning');
                canvas.scrollLeft = 0;
                canvas.scrollTop = 0;
            }

            zoomBtn.innerHTML = on ? ICON.zoomOut : ICON.zoomIn;
            zoomBtn.setAttribute('aria-label', on ? 'Zoom out' : 'Zoom in');
            zoomBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        }

        /* ---- paging --------------------------------------------------- */

        function ready() {
            frame.classList.remove('is-loading');
            layout();
            var can = !fitsWhole();
            canvas.classList[can ? 'add' : 'remove']('is-zoomable');
            zoomBtn.disabled = !can;
        }

        function preload(i) {
            var s = shots[(i + shots.length) % shots.length];
            if (s) { var p = new Image(); p.src = s.src; }
        }

        function railTo(i) {
            var b = thumbs[i];
            if (!b) return;
            var r = rail.getBoundingClientRect(), br = b.getBoundingClientRect();
            if (br.left < r.left || br.right > r.right) {
                rail.scrollLeft += br.left - r.left - (r.width - br.width) / 2;
            }
        }

        function show(i) {
            current = (i + shots.length) % shots.length;
            var s = shots[current];

            setZoom(false);
            idxEl.textContent = pad(current + 1);
            titleEl.textContent = s.cap || 'Image ' + pad(current + 1);
            countEl.textContent = pad(current + 1) + ' / ' + pad(shots.length);
            imgEl.setAttribute('alt', s.cap);

            each(thumbs, function (b, n) {
                b.classList[n === current ? 'add' : 'remove']('is-active');
                b.setAttribute('aria-current', n === current ? 'true' : 'false');
            });
            railTo(current);

            frame.classList.add('is-loading');
            imgEl.src = s.src;
            /* a cached file is already complete here and fires no load event
               in some browsers — settle it now rather than leave the spinner up */
            if (imgEl.complete && imgEl.naturalWidth) ready();

            if (shots.length > 1) { preload(current + 1); preload(current - 1); }
        }

        imgEl.addEventListener('load', ready);
        imgEl.addEventListener('error', function () {
            frame.classList.remove('is-loading');
        });

        /* ---- open / close --------------------------------------------- */

        function lock() {
            var sb = window.innerWidth - document.documentElement.clientWidth;
            prevOverflow = document.body.style.overflow;
            prevPadRight = document.body.style.paddingRight;
            document.body.style.overflow = 'hidden';
            /* the page is fixed-width for as long as the viewer is up, so pay
               back the scrollbar's width or everything behind it jumps left */
            if (sb > 0) document.body.style.paddingRight = sb + 'px';
        }

        function unlock() {
            document.body.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPadRight;
        }

        function open(i) {
            lastFocus = document.activeElement;
            show(i);
            box.removeAttribute('aria-hidden');
            box.classList.add('is-open');
            lock();
            /* Synchronous, not in a rAF. Adding .is-open resolves visibility
               to visible on the very next style recalc, so the button is
               focusable right here — and a rAF never fires at all while the
               tab is in the background, which would leave focus behind in the
               page under the modal. layout() runs again from ready(). */
            layout();
            closeBtn.focus();
        }

        function close() {
            setZoom(false);
            box.classList.remove('is-open');
            box.setAttribute('aria-hidden', 'true');
            unlock();
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        function isOpen() { return box.className.indexOf('is-open') > -1; }

        /* ---- triggers -------------------------------------------------- */

        each(triggers, function (t) {
            /* KEYBOARD ACCESS.
               The triggers are <a> elements with no href (gallery tiles) and
               <article> elements (certificate cards). Neither is focusable, and
               the only handler here was 'click' — so the gallery and the
               certificate wall could not be reached or opened by keyboard at
               all. Made operable in JS rather than in markup so every page that
               uses [data-mrnp-lightbox] gets it without 13 edits.

               aria-label comes from the caption the viewer already reads, so
               the control announces what it opens instead of nothing. */
            var tag = t.tagName.toLowerCase();
            var nativelyFocusable = tag === 'button' || (tag === 'a' && t.hasAttribute('href'));

            if (!nativelyFocusable) {
                if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '0');
                if (!t.getAttribute('role')) t.setAttribute('role', 'button');
            }
            if (!t.getAttribute('aria-label')) {
                var img = t.querySelector('img');
                var cap = t.getAttribute('data-mrnp-caption') ||
                    (img ? img.getAttribute('alt') : '') || '';
                if (cap) t.setAttribute('aria-label', 'Enlarge image: ' + cap);
            }

            function fire(e) {
                e.preventDefault();
                open(parseInt(t.getAttribute('data-mrnp-index'), 10));
            }

            t.addEventListener('click', fire);
            t.addEventListener('keydown', function (e) {
                /* Spacebar for the older browsers this site still targets */
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') fire(e);
            });
        });

        /* ---- controls -------------------------------------------------- */

        closeBtn.addEventListener('click', close);
        zoomBtn.addEventListener('click', function () { setZoom(!zoomed()); });

        box.querySelector('.mrnp-lb__nav--prev').addEventListener('click', function (e) {
            e.stopPropagation(); show(current - 1);
        });
        box.querySelector('.mrnp-lb__nav--next').addEventListener('click', function (e) {
            e.stopPropagation(); show(current + 1);
        });

        /* the scrim covers the padding gutter, so this is every click that
           lands outside the frame */
        box.addEventListener('click', function (e) {
            if (e.target === box || e.target.className === 'mrnp-lb__scrim') close();
        });

        /* ---- pan + click-to-zoom --------------------------------------- */

        var panning = false, dragged = false, sx = 0, sy = 0, sl = 0, st = 0;

        canvas.addEventListener('mousedown', function (e) {
            if (!zoomed() || e.button !== 0) return;
            panning = true;
            dragged = false;
            sx = e.clientX; sy = e.clientY;
            sl = canvas.scrollLeft; st = canvas.scrollTop;
            canvas.classList.add('is-panning');
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!panning) return;
            var dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;
            canvas.scrollLeft = sl - dx;
            canvas.scrollTop = st - dy;
        });

        document.addEventListener('mouseup', function () {
            if (!panning) return;
            panning = false;
            canvas.classList.remove('is-panning');
        });

        imgEl.addEventListener('click', function (e) {
            /* a pan ends on the image; don't read that as a zoom toggle */
            if (dragged) { dragged = false; return; }
            setZoom(!zoomed(), e.clientX, e.clientY);
        });

        /* ---- swipe ----------------------------------------------------- */

        var tx = 0, ty = 0;

        canvas.addEventListener('touchstart', function (e) {
            if (zoomed() || e.touches.length !== 1) return;
            tx = e.touches[0].clientX;
            ty = e.touches[0].clientY;
        }, { passive: true });

        canvas.addEventListener('touchend', function (e) {
            if (zoomed() || shots.length < 2 || !e.changedTouches.length) return;
            var dx = e.changedTouches[0].clientX - tx;
            var dy = e.changedTouches[0].clientY - ty;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                show(current + (dx < 0 ? 1 : -1));
            }
        }, { passive: true });

        /* ---- keyboard --------------------------------------------------- */

        document.addEventListener('keydown', function (e) {
            if (!isOpen()) return;

            if (e.key === 'Escape') {
                if (zoomed()) setZoom(false); else close();
                return;
            }
            if (e.key === 'Tab') {
                /* the viewer is modal: Tab must not walk out into the page
                   sitting behind it */
                var f = frame.querySelectorAll('button:not([disabled])');
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); first.focus();
                }
                return;
            }
            if (zoomed()) return;
            if (e.key === 'ArrowLeft') show(current - 1);
            else if (e.key === 'ArrowRight') show(current + 1);
        });

        /* ---- reflow ------------------------------------------------------ */

        var raf = null;
        window.addEventListener('resize', function () {
            if (!isOpen() || raf) return;
            raf = requestAnimationFrame(function () {
                raf = null;
                setZoom(false);
                layout();
            });
        });
    }

    /* ------------------------------------------------------------------
       4. Sticky page-nav scrollspy
    ------------------------------------------------------------------ */
    function initPageNav() {
        var nav = document.querySelector('.mrnp-pagenav');
        if (!nav) return;

        var links = nav.querySelectorAll('a[href^="#"]');
        if (!links.length) return;

        var targets = [];
        each(links, function (a) {
            var t = document.getElementById(a.getAttribute('href').slice(1));
            if (t) targets.push({ link: a, el: t });
        });
        if (!targets.length) return;

        var ticking = false;
        function update() {
            var y = window.pageYOffset + 180;
            var active = targets[0];
            targets.forEach(function (t) {
                if (t.el.offsetTop <= y) active = t;
            });
            targets.forEach(function (t) {
                t.link.classList.toggle('is-active', t === active);
            });
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
        update();
    }

    /* ------------------------------------------------------------------
       5. Hero title word-split (so pages only need plain text in the H1)
    ------------------------------------------------------------------ */
    function initSplitTitles() {
        each(document.querySelectorAll('[data-mrnp-split-words]'), function (el) {
            if (el.querySelector('.mrn-word')) return; // already marked up by hand
            var words = el.textContent.trim().split(/\s+/);
            el.innerHTML = words.map(function (w, i) {
                return '<span class="mrn-word"><span style="--d:' + (0.15 + i * 0.09).toFixed(2) + 's">' +
                    w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></span>';
            }).join(' ');
        });
    }

    /* ------------------------------------------------------------------
       6. Hero pointer parallax — headline drifts against the background
    ------------------------------------------------------------------ */
    function initHeroPointer() {
        if (reduced || window.matchMedia('(pointer: coarse)').matches) return;

        each(document.querySelectorAll('.mrnp-hero'), function (hero) {
            var inner = hero.querySelector('.mrnp-hero__inner');
            var bg = hero.querySelector('.mrnp-hero__bg');
            if (!inner) return;
            var raf = null;

            hero.addEventListener('mousemove', function (e) {
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    var r = hero.getBoundingClientRect();
                    var px = (e.clientX - r.left) / r.width - 0.5;
                    var py = (e.clientY - r.top) / r.height - 0.5;
                    inner.style.transform =
                        'rotateY(' + (px * 3) + 'deg) rotateX(' + (-py * 2.4) + 'deg) translateZ(0)';
                    if (bg) bg.style.transform = 'scale(1.06) translate3d(' + (-px * 18) + 'px,' + (-py * 14) + 'px,0)';
                    raf = null;
                });
            });

            hero.addEventListener('mouseleave', function () {
                inner.style.transform = '';
                if (bg) bg.style.transform = '';
            });
        });
    }

    /* ------------------------------------------------------------------
       Boot
    ------------------------------------------------------------------ */
    function boot() {
        initSplitTitles();
        initTilt3d();
        initAccordion();
        initLightbox();
        initPageNav();
        initHeroPointer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
