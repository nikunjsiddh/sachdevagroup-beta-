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
        if (reduced || window.matchMedia('(pointer: coarse)').matches) return;

        each(document.querySelectorAll('[data-mrnp-tilt]'), function (el) {
            var max = parseFloat(el.getAttribute('data-mrnp-tilt')) || 9;
            var raf = null;

            el.addEventListener('mousemove', function (e) {
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    var r = el.getBoundingClientRect();
                    var px = (e.clientX - r.left) / r.width - 0.5;
                    var py = (e.clientY - r.top) / r.height - 0.5;
                    el.style.transform =
                        'perspective(1000px) rotateY(' + (px * max) + 'deg) rotateX(' + (-py * max) +
                        'deg) translateY(-6px)';
                    raf = null;
                });
            });

            el.addEventListener('mouseleave', function () {
                el.style.transform = '';
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
    ------------------------------------------------------------------ */
    function initLightbox() {
        var triggers = document.querySelectorAll('[data-mrnp-lightbox]');
        if (!triggers.length) return;

        var sources = [];
        each(triggers, function (t, i) {
            var img = t.querySelector('img');
            sources.push({
                src: t.getAttribute('data-mrnp-lightbox') || (img ? img.getAttribute('src') : ''),
                cap: t.getAttribute('data-mrnp-caption') || (img ? img.getAttribute('alt') : '') || ''
            });
            t.setAttribute('data-mrnp-index', i);
        });

        var box = document.createElement('div');
        box.className = 'mrnp-lb';
        box.innerHTML =
            '<button class="mrnp-lb__close" aria-label="Close">&times;</button>' +
            '<button class="mrnp-lb__nav mrnp-lb__nav--prev" aria-label="Previous">&#8249;</button>' +
            // transparent placeholder: a src-less <img> sits in the DOM as a broken image
            // on every page until the lightbox is first opened
            '<img class="mrnp-lb__img" alt="" ' +
            'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">' +
            '<button class="mrnp-lb__nav mrnp-lb__nav--next" aria-label="Next">&#8250;</button>' +
            '<div class="mrnp-lb__count"></div>';
        document.body.appendChild(box);

        var imgEl = box.querySelector('.mrnp-lb__img');
        var countEl = box.querySelector('.mrnp-lb__count');
        var current = 0;

        function show(i) {
            current = (i + sources.length) % sources.length;
            imgEl.setAttribute('src', sources[current].src);
            imgEl.setAttribute('alt', sources[current].cap);
            countEl.textContent = (current + 1) + ' / ' + sources.length;
        }

        function open(i) {
            show(i);
            box.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            box.classList.remove('is-open');
            document.body.style.overflow = '';
        }

        each(triggers, function (t) {
            /* KEYBOARD ACCESS.
               The triggers are <a> elements with no href (gallery tiles) and
               <article> elements (certificate cards). Neither is focusable, and
               the only handler here was 'click' — so the gallery and the
               certificate wall could not be reached or opened by keyboard at
               all. Made operable in JS rather than in markup so every page that
               uses [data-mrnp-lightbox] gets it without 13 edits.

               aria-label comes from the caption the lightbox already reads, so
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

        box.querySelector('.mrnp-lb__close').addEventListener('click', close);
        box.querySelector('.mrnp-lb__nav--prev').addEventListener('click', function (e) {
            e.stopPropagation(); show(current - 1);
        });
        box.querySelector('.mrnp-lb__nav--next').addEventListener('click', function (e) {
            e.stopPropagation(); show(current + 1);
        });
        box.addEventListener('click', function (e) {
            if (e.target === box) close();
        });

        document.addEventListener('keydown', function (e) {
            if (!box.classList.contains('is-open')) return;
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') show(current - 1);
            else if (e.key === 'ArrowRight') show(current + 1);
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
