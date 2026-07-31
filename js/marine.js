/* ==========================================================================
   MARINE — motion engine for the Sachdeva Group yard site
   Vanilla JS, no dependencies. Respects prefers-reduced-motion.
   ========================================================================== */
(function () {
    'use strict';

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        var bar = document.getElementById('mrnProgress');
        if (!bar) return;
        var ticking = false;

        function update() {
            var y = window.pageYOffset || document.documentElement.scrollTop;
            var docH = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });

        update();
    }

    /* ------------------------------------------------------------------
       5. 3D tilt on figures / cards
    ------------------------------------------------------------------ */
    function initTilt() {
        if (reduced) return;
        var nodes = document.querySelectorAll('[data-mrn-tilt]');

        Array.prototype.forEach.call(nodes, function (el) {
            var max = parseFloat(el.getAttribute('data-mrn-tilt')) || 8;
            var target = el.querySelector('.mrn-figure__frame') || el;

            el.addEventListener('mousemove', function (e) {
                var r = el.getBoundingClientRect();
                var px = (e.clientX - r.left) / r.width - 0.5;
                var py = (e.clientY - r.top) / r.height - 0.5;
                target.style.transform =
                    'rotateY(' + (px * max) + 'deg) rotateX(' + (-py * max) + 'deg) translateZ(0)';
            });

            el.addEventListener('mouseleave', function () {
                target.style.transform = 'rotateY(0) rotateX(0)';
            });
        });
    }

    /* ------------------------------------------------------------------
       6. Parallax layers
    ------------------------------------------------------------------ */
    function initParallax() {
        if (reduced) return;
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

        Array.prototype.forEach.call(nodes, function (el) {
            el.addEventListener('mousemove', function (e) {
                var r = el.getBoundingClientRect();
                var x = e.clientX - r.left - r.width / 2;
                var y = e.clientY - r.top - r.height / 2;
                el.style.transform = 'translate(' + x * 0.22 + 'px,' + (y * 0.3 - 4) + 'px)';
            });
            el.addEventListener('mouseleave', function () {
                el.style.transform = '';
            });
        });
    }

    /* ------------------------------------------------------------------
       9. Duplicate marquee tracks so the loop is seamless
    ------------------------------------------------------------------ */
    function initMarquees() {
        var tracks = document.querySelectorAll('[data-mrn-marquee]');
        Array.prototype.forEach.call(tracks, function (track) {
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
