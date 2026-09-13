/* ==========================================================================
   MARINE — motion engine for the Sachdeva Group yard site
   Vanilla JS, no dependencies. Respects prefers-reduced-motion.
   ========================================================================== */
(function () {
    'use strict';

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* GSAP STAND-DOWN
       index.html sets window.SG_MOTION_ENGINE='gsap' in its head shim and loads
       js/motion.js, which owns the scroll-driven work on that page: the reading
       progress bar, the parallax layers, the timeline fill, the counters and
       the #credentials marquee. Everything else here — tilt, magnetic buttons,
       the hero particle canvas, nav-active, and the [data-mrn-reveal] /
       [data-mrn-stagger] reveal engine — keeps running everywhere.

       This is a flag rather than a deletion because the 12 inner pages still
       depend on all of it: 70 [data-mrn-reveal] and 25 [data-mrn-stagger]
       elements live there, and index.html has none of either. Removing those
       observers as "dead code" would leave 95 elements on 12 pages stuck at
       opacity 0 for good. */
    var gsapOwns = window.SG_MOTION_ENGINE === 'gsap';

    /* ------------------------------------------------------------------
       1. Scroll reveal
    ------------------------------------------------------------------ */
    function initReveal() {
        var items = document.querySelectorAll('[data-mrn-reveal]');
        if (!items.length) return;

        if (reduced || !('IntersectionObserver' in window)) {
            Array.prototype.forEach.call(items, function (el) { el.classList.add('mrn-in'); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add('mrn-in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        Array.prototype.forEach.call(items, function (el) { io.observe(el); });
    }

    /* ------------------------------------------------------------------
       2. Number counters
    ------------------------------------------------------------------ */
    function animateCount(el) {
        var target = parseFloat(el.getAttribute('data-count')) || 0;
        var decimals = (el.getAttribute('data-decimals') | 0);
        var duration = parseInt(el.getAttribute('data-duration'), 10) || 1900;

        if (reduced) { el.textContent = target.toFixed(decimals); return; }

        var start = null;
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            // easeOutExpo
            var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            el.textContent = (target * eased).toFixed(decimals);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = target.toFixed(decimals);
        }
        requestAnimationFrame(step);
    }

    function initCounters() {
        var nums = document.querySelectorAll('[data-count]');
        if (!nums.length) return;

        /* On index.html ScrollTrigger fires these from the same trigger that
           reveals the stat row, so the numbers start with the row rather than
           on their own threshold. The animation itself is unchanged — only who
           starts it. window.MRN.startCount is published below. */
        if (gsapOwns) return;

        // reduced motion / no observer: just print the final figures right away
        if (reduced || !('IntersectionObserver' in window)) {
            Array.prototype.forEach.call(nums, animateCount);
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    animateCount(e.target);
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.5 });

        Array.prototype.forEach.call(nums, function (el) { io.observe(el); });
    }

    /* ------------------------------------------------------------------
       3. Hero underwater particle field (canvas)
    ------------------------------------------------------------------ */
    function initHeroCanvas() {
        var canvas = document.getElementById('mrnHeroCanvas');
        if (!canvas || reduced) return;

        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = 0, h = 0;
        var particles = [];
        var mouse = { x: -9999, y: -9999 };
        var rafId = null;
        var running = true;

        function resize() {
            w = canvas.offsetWidth;
            h = canvas.offsetHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
        }

        function build() {
            var count = Math.min(Math.round((w * h) / 16000), 110);
            particles = [];
            for (var i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 2.1 + 0.6,
                    vx: (Math.random() - 0.5) * 0.28,
                    vy: -(Math.random() * 0.34 + 0.06),
                    a: Math.random() * 0.45 + 0.15,
                    hue: Math.random() > 0.72 ? 'gold' : 'aqua'
                });
            }
        }

        function draw() {
            if (!running) return;
            ctx.clearRect(0, 0, w, h);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];

                p.x += p.vx;
                p.y += p.vy;

                // gentle cursor repulsion — feels like water displacement
                var dx = p.x - mouse.x, dy = p.y - mouse.y;
                var d2 = dx * dx + dy * dy;
                if (d2 < 16000) {
                    var d = Math.sqrt(d2) || 1;
                    p.x += (dx / d) * 1.5;
                    p.y += (dy / d) * 1.5;
                }

                if (p.y < -12) { p.y = h + 12; p.x = Math.random() * w; }
                if (p.x < -12) p.x = w + 12;
                if (p.x > w + 12) p.x = -12;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.hue === 'gold'
                    ? 'rgba(255, 204, 41, ' + p.a + ')'
                    : 'rgba(178, 236, 255, ' + p.a + ')';
                ctx.fill();

                // constellation links
                for (var j = i + 1; j < particles.length; j++) {
                    var q = particles[j];
                    var lx = p.x - q.x, ly = p.y - q.y;
                    var dist = lx * lx + ly * ly;
                    if (dist < 10000) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = 'rgba(178, 236, 255, ' + (0.10 * (1 - dist / 10000)) + ')';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
            rafId = requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        canvas.parentElement.addEventListener('mousemove', function (e) {
            var rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });
        canvas.parentElement.addEventListener('mouseleave', function () {
            mouse.x = mouse.y = -9999;
        });

        // pause when the hero scrolls out of view — keeps the page cheap
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting && !running) { running = true; draw(); }
                    else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(rafId); }
                });
            }, { threshold: 0 }).observe(canvas);
        }

        resize();
        draw();
    }

    /* ------------------------------------------------------------------
       4. Scroll progress bar
       (sticky header + back-to-top stay owned by js/main.js — don't double up)
    ------------------------------------------------------------------ */
    function initScrollChrome() {
        if (gsapOwns) return;      /* motion.js drives #mrnProgress with scaleX */
        var bar = document.getElementById('mrnProgress');
        if (!bar) return;
        var ticking = false;
        var travel = 0;

        /* scrollHeight is a layout read, and it was being taken inside the
           rAF on every scrolled frame on all twelve inner pages. It only
           changes when the document does, so it is cached here and refreshed
           on resize instead. */
        function remeasure() {
            travel = document.documentElement.scrollHeight - window.innerHeight;
        }

        function update() {
            var y = window.pageYOffset || document.documentElement.scrollTop;
            var p = travel > 0 ? y / travel : 0;
            if (p < 0) { p = 0; } else if (p > 1) { p = 1; }
            /* scaleX, not width. Width is a layout property: every frame put
               the bar through layout and paint. A transform on a fixed,
               already-composited element is handled off the main thread. */
            bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });

        var rt = null;
        window.addEventListener('resize', function () {
            clearTimeout(rt);
            rt = setTimeout(function () { remeasure(); update(); }, 150);
        }, { passive: true });

        /* the document keeps growing as images and fonts land */
        window.addEventListener('load', function () { remeasure(); update(); }, false);

        remeasure();
        update();
    }

    /* ------------------------------------------------------------------
       5. 3D tilt on figures / cards
    ------------------------------------------------------------------ */
    function initTilt() {
        /* NOT gated on prefers-reduced-motion, deliberately, and it is the one
           handler in this file that is not.

           A hover tilt is not the kind of motion the preference exists to
           stop: nothing moves until the visitor puts their own pointer on the
           card, it tracks that pointer one-to-one rather than animating on its
           own, and it stops the instant they leave. Scroll parallax, the
           counters and the marquee are the vestibular risks here and all three
           stay gated above.

           Everything else on the page keeps honouring the preference. If this
           is ever revisited, the honest alternative is to shrink `max` under
           reduced motion rather than to remove the effect. */
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

        var nodes = document.querySelectorAll('[data-mrn-tilt]');

        Array.prototype.forEach.call(nodes, function (el) {
            var max = parseFloat(el.getAttribute('data-mrn-tilt')) || 8;
            var target = el.querySelector('.mrn-figure__frame') || el;

            /* A rotateX/rotateY with no perspective anywhere in the chain is
               an orthographic rotation: the card squashes very slightly and
               reads as nothing at all. Only .d3-stage (index-theme.css:299)
               and a handful of about-fx grids supply one, so on
               environment_management, health_safety, news, our_credentials,
               testimonials and vision_mission this handler has been rotating
               cards flat. Inline one where the chain has none — and only
               there, so a stage that already projects is not projected twice.

               Measured once at bind time: the perspective owner is an
               ancestor and a card cannot change ancestors mid-hover. */
            var projected = false;
            for (var a = target.parentNode; a && a.nodeType === 1; a = a.parentNode) {
                if (window.getComputedStyle(a).perspective !== 'none') { projected = true; break; }
            }
            var lens = projected ? '' : 'perspective(1000px) ';

            /* The card itself gets the lift; a nested .mrn-figure__frame does
               not, because it is a photo inside a figure and raising it opens
               a gap against its own caption.

               This is also the lift those cards were always meant to have.
               .mrnp-icard:hover, .mrnp-certcard:hover and .mrn-card:hover all
               declare a translateY, and all three are dead on a tilted card:
               the inline transform written below outranks them the moment the
               pointer moves. css/about-fx.css:1690 reaches the same
               conclusion and strips those rules for the About cards. */
            var lift = (target === el) ? ' translateY(-6px)' : '';

            var raf = null, ev = null;

            el.addEventListener('mousemove', function (e) {
                ev = e;
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    raf = null;
                    var r = el.getBoundingClientRect();
                    if (!r.width || !r.height) return;
                    var px = (ev.clientX - r.left) / r.width - 0.5;
                    var py = (ev.clientY - r.top) / r.height - 0.5;
                    /* `important` is load-bearing. Eight stylesheets carry
                       `@media (prefers-reduced-motion: reduce)` blocks that
                       set `transform: none !important` on these very cards —
                       css/about-fx.css:1971 is the clearest — and a plain
                       inline transform loses to a stylesheet !important.
                       Measured: the same value set without the flag computes
                       to `none`, and with it computes to a real matrix3d.

                       Those rules are NOT edited out, because they do a second
                       job this must not break: entrance animations are
                       authored at translateY(30px) / scaleX(0), so forcing
                       identity is what stops them sitting at their `from`
                       state for ever. Overriding only while the pointer is on
                       the card leaves that intact — mouseleave hands the
                       element straight back to the stylesheet. */
                    target.style.setProperty('transform',
                        lens + 'rotateY(' + (px * max).toFixed(2) + 'deg) rotateX(' +
                        (-py * max).toFixed(2) + 'deg)' + lift, 'important');
                });
            }, { passive: true });

            el.addEventListener('mouseleave', function () {
                if (raf) { cancelAnimationFrame(raf); raf = null; }
                /* removeProperty, not = '' — an !important inline declaration
                   is not cleared by assigning the empty string in every
                   engine, and leaving it behind would pin the card tilted. */
                target.style.removeProperty('transform');
            });
        });
    }

    /* ------------------------------------------------------------------
       6. Parallax layers
    ------------------------------------------------------------------ */
    function initParallax() {
        if (reduced) return;
        /* index.html's four layers are migrated to data-sg-parallax tiers and
           driven by motion.js. This handler stays for any page that still uses
           the numeric attribute. */
        if (gsapOwns) return;
        var layers = document.querySelectorAll('[data-mrn-parallax]');
        if (!layers.length) return;
        var ticking = false;

        function update() {
            var vh = window.innerHeight;
            Array.prototype.forEach.call(layers, function (el) {
                var r = el.getBoundingClientRect();
                if (r.bottom < -200 || r.top > vh + 200) return;
                var speed = parseFloat(el.getAttribute('data-mrn-parallax')) || 0.15;
                var offset = (r.top + r.height / 2 - vh / 2) * -speed;
                el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
            });
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ------------------------------------------------------------------
       7. Timeline progress line
    ------------------------------------------------------------------ */
    function initTimeline() {
        if (gsapOwns) return;      /* motion.js fills it with clip-path */
        var line = document.getElementById('mrnTimelineProgress');
        var list = document.getElementById('mrnTimeline');
        if (!line || !list) return;

        function update() {
            var r = list.getBoundingClientRect();
            var vh = window.innerHeight;
            var travelled = vh * 0.6 - r.top;
            var pct = Math.max(0, Math.min(travelled / r.height, 1));
            line.style.height = (pct * 100) + '%';
        }

        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(function () { update(); ticking = false; }); ticking = true; }
        }, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ------------------------------------------------------------------
       8. Magnetic buttons
    ------------------------------------------------------------------ */
    function initMagnetic() {
        if (reduced || window.matchMedia('(pointer: coarse)').matches) return;
        var nodes = document.querySelectorAll('[data-mrn-magnetic]');

        /* getBoundingClientRect() reports the box AFTER transforms, so reading
           it inside the mousemove fed the button's own displacement back into
           the next offset. Two things came out of that, both of which read as
           the button drifting on its own:

             - the magnet settled at 0.18x the intended pull, not 0.22x, and it
               took five or six samples to converge, so each move wobbled;
             - .mrn-btn transitions transform, so every sample landed mid-tween
               and produced a fresh target. Under a still cursor the button
               kept creeping instead of settling.

           Subtract the live translation to recover the layout box, and take
           transform out of the transition while the pointer owns the element
           so the follow is 1:1. The eased return comes back on mouseleave. */
        function translation(el) {
            var t = window.getComputedStyle(el).transform;
            if (!t || t === 'none') return [0, 0];
            var n = t.slice(t.indexOf('(') + 1, -1).split(',');
            return t.indexOf('matrix3d') === 0
                ? [parseFloat(n[12]) || 0, parseFloat(n[13]) || 0]
                : [parseFloat(n[4]) || 0, parseFloat(n[5]) || 0];
        }

        /* THE CENTRE IS MEASURED ONCE PER HOVER, NOT ONCE PER POINTER MOVE.

           The mousemove handler used to take four separate layout readings
           every time the pointer moved a pixel: getBoundingClientRect(),
           getComputedStyle().transform via translation(), offsetWidth and
           offsetHeight. Each one flushes pending style and layout, and they
           were interleaved with the transform write from the previous frame,
           so the browser was forced to re-layout on every event — the textbook
           read/write thrash, on the hottest input path there is.

           None of those four values can change while the pointer is inside
           the button. Its layout box is fixed, and the only thing writing its
           transform is this handler. So they are captured on mouseenter and
           reused, which leaves the move handler doing arithmetic and nothing
           else. The listener is also passive now: it never called
           preventDefault, but without the flag the browser had to assume it
           might. */
        Array.prototype.forEach.call(nodes, function (el) {
            var frame = 0, px = 0, py = 0;
            var cx = 0, cy = 0;

            function write() {
                frame = 0;
                el.style.transform = 'translate(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px)';
            }

            function measure() {
                var r = el.getBoundingClientRect();
                var d = translation(el);
                cx = r.left - d[0] + el.offsetWidth / 2;
                cy = r.top - d[1] + el.offsetHeight / 2;
            }

            el.addEventListener('mouseenter', function () {
                el.classList.add('mrn-magnet-on');
                measure();
            }, { passive: true });

            el.addEventListener('mousemove', function (e) {
                px = (e.clientX - cx) * 0.22;
                py = (e.clientY - cy) * 0.3 - 4;
                if (!frame) frame = window.requestAnimationFrame(write);
            }, { passive: true });

            el.addEventListener('mouseleave', function () {
                if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
                el.classList.remove('mrn-magnet-on');
                el.style.transform = '';
            }, { passive: true });
        });
    }

    /* ------------------------------------------------------------------
       9. Duplicate marquee tracks so the loop is seamless
    ------------------------------------------------------------------ */
    function initMarquees() {
        var tracks = document.querySelectorAll('[data-mrn-marquee]');
        Array.prototype.forEach.call(tracks, function (track) {
            /* the #credentials track becomes velocity-linked under motion.js,
               which does its own doubling — doubling it twice would leave the
               -50% loop landing mid-sequence. The .mrn-ticker track above the
               stats band is untouched and still belongs here. */
            if (gsapOwns && track.closest && track.closest('#credentials')) return;
            track.innerHTML += track.innerHTML;
        });
    }

    /* ------------------------------------------------------------------
       10. Stagger helper — turns data-mrn-stagger into per-child delays
    ------------------------------------------------------------------ */
    function initStagger() {
        var groups = document.querySelectorAll('[data-mrn-stagger]');
        Array.prototype.forEach.call(groups, function (group) {
            var step = parseInt(group.getAttribute('data-mrn-stagger'), 10) || 110;
            Array.prototype.forEach.call(group.children, function (child, i) {
                child.style.setProperty('--mrn-delay', (i * step) + 'ms');
            });
        });
    }

    /* ------------------------------------------------------------------
       11. Highlight the current page in the shared nav
    ------------------------------------------------------------------ */
    function initNavActive() {
        var links = document.querySelectorAll('#main-menu > li > a[href], #main-menu .dropdown-menu > li > a[href]');
        if (!links.length) return;

        var current = location.pathname.split('/').pop() || 'index.html';

        Array.prototype.forEach.call(links, function (a) {
            var href = a.getAttribute('href').split('/').pop();
            if (!href || href !== current) return;

            var li = a.parentElement;
            if (li) li.classList.add('mrn-nav-active');

            var parentDropdown = li && li.closest ? li.closest('li.dropdown') : null;
            if (parentDropdown) parentDropdown.classList.add('mrn-nav-active');
        });
    }

    /* ------------------------------------------------------------------
       Boot
    ------------------------------------------------------------------ */
    function boot() {
        initMarquees();
        initStagger();
        initReveal();
        initCounters();
        initHeroCanvas();
        initScrollChrome();
        initTilt();
        initParallax();
        initTimeline();
        initMagnetic();
        initNavActive();
    }

    /* Published so js/motion.js can start a counter from the same ScrollTrigger
       that reveals the row it sits in, instead of each number waiting on its own
       IntersectionObserver threshold. The animation is animateCount() above,
       unchanged — this only hands over the trigger. */
    window.MRN = window.MRN || {};
    window.MRN.startCount = function (el) {
        if (!el || el.__mrnCounted) return;
        el.__mrnCounted = true;
        animateCount(el);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
