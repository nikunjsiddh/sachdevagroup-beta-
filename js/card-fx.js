/* ==========================================================================
   SACHDEVA GROUP — CARD FX
   Builds the cursor-tracked overlay css/card-fx.css draws
   ==========================================================================
   Loaded on all 13 pages, after js/marine.js.

   WHAT IT DOES
     For every card in SEL: append one <i class="sg-cardfx">, mark the card
     .sg-has-cardfx, and write --mx / --my on it as the pointer moves. The
     stylesheet does the rest — this file owns no colour and no geometry.

   WHY IT WRITES THE CUSTOM PROPERTIES ON THE CARD AND NOT THE OVERLAY
     Both of the overlay's pseudo-elements read them, and a custom property
     set on the card inherits down to both. One write per frame instead of two.

   RELATIONSHIP TO THE TILT HANDLERS
     js/marine.js initTilt ([data-mrn-tilt]) and js/marine-pages.js
     initTilt3d ([data-mrnp-tilt]) already own `transform` on most of these
     cards. This file never touches transform, so the two compose: the tilt
     rotates and lifts the card, this lights it.

     Every family in SEL now carries one of the two tilt attributes. Four of
     them did not until the coverage sweep: .mrnp-infocard (whose depth rules
     already existed in css/page-fx.css, keyed on [data-mrnp-tilt], and had
     simply never been switched on in any page's markup), .pfx-fact,
     .pfx-step and .mrnp-gal__item — plus .mrn-tile, .mrn-stat and .mrn-cert
     on index. index.html loads marine.js but not marine-pages.js, so those
     three take data-mrn-tilt rather than data-mrnp-tilt.

   POINTER GATE
     Coarse pointers get nothing — no overlay element, no listeners. There is
     no hover to track, and on a touch device :hover latches after a tap,
     which would leave a card lit until something else was tapped.

     Reduced motion is NOT gated: nothing here travels. See the note at the
     top of css/card-fx.css.

   THE SELECTOR LIST
     Mirrored in css/card-fx.css. Keep the two in step.
   ========================================================================== */

(function () {
    'use strict';

    var SEL = [
        '.mrnp-icard',      /* environment, health_safety, news, credentials, testimonials, vision */
        '.mrnp-certcard',   /* about_us, our_credentials                                          */
        '.mrnp-quote',      /* testimonials                                                       */
        '.d3-card',         /* index — covers .mrn-card, .mrn-step and .mrn-unit                  */
        '.mrn-card',        /* index, for any .mrn-card that is not also a .d3-card               */
        '.pfx-fact',        /* news                                                               */
        '.cmp',             /* about_us — compliance plates                                       */
        '.tst',             /* about_us — testimonial records                                     */
        '.viz-card',        /* about_us — vision / mission plates                                 */
        '.abt-unit',        /* about_us — the two company cards                                   */
        '.abt-time__item',  /* about_us — heritage dates                                          */
        '.mrnp-infocard',   /* contact, environment, jjsb, credentials, sspsb, testimonials, vision */
        '.mrnp-gal__item',  /* gallery                                                            */
        '.pfx-step',        /* waste_management                                                   */
        '.mrn-tile',        /* index — the gallery link tiles                                     */
        '.mrn-stat',        /* index — the figures band                                           */
        '.mrn-cert'         /* index — certificates, inside a marquee that pauses on hover        */
    ].join(', ');

    function init() {
        /* No hover to follow, and :hover latches after a tap on touch. */
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

        var cards = document.querySelectorAll(SEL);
        if (!cards.length) return;

        Array.prototype.forEach.call(cards, function (card) {
            /* .d3-card and .mrn-card overlap on index.html — three elements
               carry both, and they must not end up with two overlays. */
            if (card.classList.contains('sg-has-cardfx')) return;

            /* The overlay is absolutely positioned against the card, so the
               card has to be a containing block. Nearly all of them already
               are; this catches the few that are not without a CSS rule that
               would also hit a card legitimately positioned some other way. */
            if (window.getComputedStyle(card).position === 'static') {
                card.style.position = 'relative';
            }

            var fx = document.createElement('i');
            fx.className = 'sg-cardfx';
            fx.setAttribute('aria-hidden', 'true');
            card.appendChild(fx);
            card.classList.add('sg-has-cardfx');

            var raf = null;
            var lastX = -1, lastY = -1;

            card.addEventListener('mousemove', function (e) {
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    raf = null;
                    var r = card.getBoundingClientRect();
                    if (!r.width || !r.height) return;

                    var x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
                    var y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
                    if (x === lastX && y === lastY) return;

                    lastX = x;
                    lastY = y;
                    card.style.setProperty('--mx', x + '%');
                    card.style.setProperty('--my', y + '%');
                });
            }, { passive: true });

            /* The overlay fades out on its own, but the last cursor position
               is left behind — so the ring would light up in the wrong corner
               for the first frame of the next hover. Re-centring on the way
               out means it always fades back in from the middle. */
            card.addEventListener('mouseleave', function () {
                if (raf) { cancelAnimationFrame(raf); raf = null; }
                lastX = lastY = -1;
                card.style.setProperty('--mx', '50%');
                card.style.setProperty('--my', '50%');
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
