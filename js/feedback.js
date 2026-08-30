/* ==========================================================================
   SG FEEDBACK — the floating feedback launcher and its form
   ==========================================================================
   Load order (end of <body>): after js/page-fx.js. Nothing here depends on
   page-fx.js, but it shares that file's guard, so the two switch on and off
   together.

   FRONT END ONLY — READ THIS BEFORE SHIPPING
   submit() validates, then shows the success panel. It sends NOTHING. There
   is no endpoint, no fetch, no mail handler: the form was specified as a
   design, and inventing a destination for a stranger's name and phone number
   is not a decision this file gets to make.
   That means the success panel currently tells the visitor their feedback has
   been received when it has not. Before this goes near production, either
   wire submit() to a real endpoint (FormToEmail.php is what contact_us.html
   posts to) or take the widget off the page. Do not leave it as it is.

   WHY THE WIDGET BUILDS ITSELF
   There is no markup for any of this in the 12 pages. The launcher and the
   dialog carry no page-specific content, so authoring them by hand would be
   12 copies of one block to keep in step — the same reason initLightbox() in
   js/marine-pages.js builds its own DOM. Adding the widget to a page is one
   <script> line; there is nothing else to remember.

   WHAT IT DOES NOT DO
   No entrance animation, no scroll coupling, no transform on anything the
   other engines own. The launcher is position:fixed and outside .wrapper, so
   it is not in any parallax or reveal subtree.

   ES5 only — no let/const/arrow/template string — same target as the rest of
   the site's scripts.
   ========================================================================== */
(function (win, doc) {
    'use strict';

    if (win.SGFeedback) return;

    /* Same test js/page-fx.js uses. index.html is built from .mrn-section and
       does not load css/page-fx.css, which is where every rule below lives —
       booting here would append an unstyled dialog to the home page. */
    if (!doc.querySelector('.mrnp-section')) return;

    win.SGFeedback = true;

    var ICON = {
        chat: '<path d="M20.4 15.2a2 2 0 0 1-2 2H8.6L4 20.8V5.4a2 2 0 0 1 2-2h12.4a2 2 0 0 1 2 2z"/><path d="M8 8.8h8"/><path d="M8 12.4h5.2"/>',
        close: '<path d="M6.4 6.4 17.6 17.6"/><path d="M17.6 6.4 6.4 17.6"/>',
        worker: '<path d="M4.6 15.4a7.4 7.4 0 0 1 14.8 0"/><path d="M9.4 8.6V5.8a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v2.8"/><path d="M3.4 15.4h17.2a1 1 0 0 1 1 1v1.1a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1v-1.1a1 1 0 0 1 1-1z"/>',
        visitor: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20.1a7 7 0 0 1 14 0"/><path d="M2.6 4.4v3.2"/><path d="M21.4 4.4v3.2"/>',
        customer: '<rect x="2.8" y="7.6" width="18.4" height="11.8" rx="2"/><path d="M8.6 7.6V6a1.6 1.6 0 0 1 1.6-1.6h3.6A1.6 1.6 0 0 1 15.4 6v1.6"/><path d="M2.8 12.6h18.4"/><path d="M11 12.6h2"/>',
        check: '<path d="M4.8 12.6 9.9 17.7 19.2 7.4"/>'
    };

    function svg(paths, sw) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
            (sw || '1.7') + '" stroke-linecap="round" stroke-linejoin="round" ' +
            'aria-hidden="true" focusable="false">' + paths + '</svg>';
    }

    /* ----------------------------------------------------------------------
       1. The fields, as data
       Each one owns its own rule, so the markup, the live re-check and the
       submit pass all read the same list and cannot drift apart.
    ---------------------------------------------------------------------- */

    /* Letters, spaces and the three marks a name legitimately carries, plus
       the Devanagari and Gujarati blocks — this is a Bhavnagar yard and a
       name typed in Gujarati is not a validation failure. */
    var NAME_OK = /^[A-Za-zÀ-ɏऀ-ॿ઀-૿][A-Za-zÀ-ɏऀ-ॿ઀-૿ .'\-]*$/;

    var FIELDS = [
        {
            id: 'sgfbName', name: 'name', label: 'Name', type: 'text',
            autocomplete: 'name', max: 60,
            check: function (v) {
                if (!v) return 'Please enter your name.';
                if (v.length < 2) return 'Name must be at least 2 characters.';
                if (!NAME_OK.test(v)) return 'Use letters only — spaces, . \' and - are fine.';
                return '';
            }
        },
        {
            id: 'sgfbRole', name: 'designation', label: 'Designation', type: 'text',
            autocomplete: 'organization-title', max: 60,
            check: function (v) {
                if (!v) return 'Please enter your designation.';
                if (v.length < 2) return 'Designation must be at least 2 characters.';
                return '';
            }
        },
        {
            id: 'sgfbTel', name: 'mobile', label: 'Mobile No.', type: 'tel',
            autocomplete: 'tel', inputmode: 'tel', max: 18, wide: true,
            check: function (v) {
                if (!v) return 'Please enter your mobile number.';

                /* Accept the number the way people actually write it:
                   +91 98765 43210, 091-98765-43210, (0278) 9876543210. */
                var raw = v.replace(/[\s\-().]/g, '');
                if (!/^\+?[0-9]+$/.test(raw)) {
                    return 'Use digits only — spaces, - and +91 are fine.';
                }

                var d = raw.replace(/^\+/, '');

                /* The prefix comes off ONLY when there is something in front of
                   a 10-digit number to take off. Stripping unconditionally
                   fails a real number: 9198765432 is ten digits and starts
                   with 9, and a blind /^91/ eats its first two, leaving eight
                   and rejecting a subscriber whose number is simply in the 91
                   series. Alternation is ordered longest-first for the same
                   reason — 091… must not match the bare 0 branch. */
                if (d.length > 10) d = d.replace(/^(0091|091|91|0)/, '');

                if (d.length !== 10) return 'A mobile number is 10 digits.';
                if (!/^[6-9]/.test(d)) return 'An Indian mobile number starts with 6, 7, 8 or 9.';
                return '';
            }
        },
        {
            id: 'sgfbNote', name: 'note', label: 'Note', area: true, max: 500,
            check: function (v) {
                if (!v) return 'Please write your feedback.';
                if (v.length < 5) return 'Please write at least 5 characters.';
                return '';
            }
        }
    ];

    var TYPES = [
        { v: 'Workers', icon: ICON.worker, hint: 'Yard &amp; site staff' },
        { v: 'Visitors', icon: ICON.visitor, hint: 'Guests at the yard' },
        { v: 'Customers', icon: ICON.customer, hint: 'Owners &amp; buyers' }
    ];

    /* ----------------------------------------------------------------------
       2. Markup
    ---------------------------------------------------------------------- */

    function fieldHTML(f) {
        var el = f.area
            ? '<textarea id="' + f.id + '" name="' + f.name + '" rows="4" maxlength="' + f.max +
              '" placeholder=" " aria-describedby="' + f.id + 'Err"></textarea>'
            : '<input type="' + f.type + '" id="' + f.id + '" name="' + f.name +
              '" maxlength="' + f.max + '" placeholder=" "' +
              (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : '') +
              (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') +
              ' aria-describedby="' + f.id + 'Err">';

        /* placeholder=" " is load-bearing, not a typo: the floating label in
           marine-pages.css is driven by :not(:placeholder-shown). */
        return '<div class="mrnp-field sgfb-field' +
            (f.area ? ' sgfb-field--note' : '') +
            (f.wide || f.area ? ' sgfb-field--wide' : '') + '">' +
            el +
            '<label for="' + f.id + '">' + f.label + '</label>' +
            '<span class="mrnp-field__line"></span>' +
            (f.area ? '<span class="sgfb-count"><b>0</b> / ' + f.max + '</span>' : '') +
            '<span class="sgfb-err" id="' + f.id + 'Err" role="alert"></span>' +
            '</div>';
    }

    function typeHTML(t, i) {
        return '<label class="sgfb-type">' +
            '<input type="radio" name="feedbackType" value="' + t.v + '"' +
            (i === 0 ? ' data-sgfb-first' : '') + '>' +
            '<span class="sgfb-type__box">' +
            '<span class="sgfb-type__ico">' + svg(t.icon) + '</span>' +
            '<b>' + t.v + '</b>' +
            '<i>' + t.hint + '</i>' +
            '<span class="sgfb-type__tick">' + svg(ICON.check, '2.4') + '</span>' +
            '</span></label>';
    }

    function build() {
        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'sgfb-launch';
        btn.id = 'sgfbLaunch';
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<span class="sgfb-launch__ico">' + svg(ICON.chat) + '</span>' +
            '<span class="sgfb-launch__txt">Feedback</span>';

        var wrap = doc.createElement('div');
        wrap.className = 'sgfb';
        wrap.id = 'sgfbDialog';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-labelledby', 'sgfbTitle');
        wrap.setAttribute('aria-hidden', 'true');

        var types = '', i;
        for (i = 0; i < TYPES.length; i++) types += typeHTML(TYPES[i], i);

        var fields = '';
        for (i = 0; i < FIELDS.length; i++) fields += fieldHTML(FIELDS[i]);

        wrap.innerHTML =
            '<div class="sgfb__scrim" data-sgfb-close></div>' +
            '<div class="sgfb__panel" role="document">' +
                '<span class="sgfb__glow" aria-hidden="true"></span>' +
                '<button type="button" class="sgfb__close" data-sgfb-close aria-label="Close feedback form">' +
                    svg(ICON.close, '2') + '</button>' +

                '<div class="sgfb__head">' +
                    '<span class="mrn-eyebrow">Feedback</span>' +
                    '<h3 id="sgfbTitle">Tell us how we <em>did</em></h3>' +
                    '<p>Your name and number stay with the Sachdeva Group office. Every field is required.</p>' +
                '</div>' +

                '<form class="sgfb__form" novalidate>' +
                    '<fieldset class="sgfb-types" aria-describedby="sgfbTypeErr">' +
                        '<legend>Feedback from</legend>' +
                        '<div class="sgfb-types__grid">' + types + '</div>' +
                        '<span class="sgfb-err" id="sgfbTypeErr" role="alert"></span>' +
                    '</fieldset>' +
                    fields +
                    '<div class="sgfb__actions">' +
                        '<button type="submit" class="mrn-btn mrn-btn--gold sgfb__send">Send Feedback' +
                            '<svg class="sg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
                            'focusable="false"><path d="M2.5 12h17"/><path d="m13.2 5.7 6.3 6.3-6.3 6.3"/></svg>' +
                        '</button>' +
                        '<button type="button" class="mrn-btn mrn-btn--ghost sgfb__cancel" data-sgfb-close>Cancel</button>' +
                    '</div>' +
                '</form>' +

                '<div class="sgfb__done" hidden>' +
                    '<span class="sgfb__done-mark">' + svg(ICON.check, '2.2') + '</span>' +
                    '<h4>Thank you</h4>' +
                    '<p class="sgfb__done-msg"></p>' +
                    '<button type="button" class="mrn-btn mrn-btn--ghost" data-sgfb-close>Close</button>' +
                '</div>' +
            '</div>';

        doc.body.appendChild(btn);
        doc.body.appendChild(wrap);
        return { btn: btn, wrap: wrap };
    }

    /* ----------------------------------------------------------------------
       3. Behaviour
    ---------------------------------------------------------------------- */

    function boot() {
        var made = build();
        var btn = made.btn, wrap = made.wrap;
        var panel = wrap.querySelector('.sgfb__panel');
        var form = wrap.querySelector('.sgfb__form');
        var done = wrap.querySelector('.sgfb__done');
        var doneMsg = wrap.querySelector('.sgfb__done-msg');
        var typeErr = wrap.querySelector('#sgfbTypeErr');
        var radios = wrap.querySelectorAll('input[name="feedbackType"]');
        var lastFocus = null;
        var tried = false;          /* has submit been attempted once? */

        function err(box, msg) {
            var slot = box.querySelector('.sgfb-err');
            if (slot) slot.textContent = msg || '';
            if (msg) {
                box.className += (box.className.indexOf('is-bad') > -1 ? '' : ' is-bad');
            } else {
                box.className = box.className.replace(/\s*is-bad/g, '');
            }
            return !msg;
        }

        function checkType(quiet) {
            var i, picked = false;
            for (i = 0; i < radios.length; i++) if (radios[i].checked) picked = true;
            var set = wrap.querySelector('.sgfb-types');
            if (quiet && !picked) return false;
            return err(set, picked ? '' : 'Please choose who this feedback is from.');
        }

        function checkField(f, quiet) {
            var el = doc.getElementById(f.id);
            var box = el.parentNode;
            var msg = f.check(el.value.replace(/^\s+|\s+$/g, ''));
            if (quiet && msg) return false;
            return err(box, msg);
        }

        /* live re-check, but only AFTER the first submit — flagging a field the
           visitor has not finished typing in is nagging, not validation */
        function watch(f) {
            var el = doc.getElementById(f.id);
            var ev = f.area ? 'input' : 'input';
            el.addEventListener(ev, function () {
                if (tried) checkField(f);
                if (f.area) {
                    var c = el.parentNode.querySelector('.sgfb-count b');
                    if (c) c.textContent = String(el.value.length);
                }
            });
            el.addEventListener('blur', function () {
                if (el.value.replace(/^\s+|\s+$/g, '')) checkField(f);
            });
        }

        var i;
        for (i = 0; i < FIELDS.length; i++) watch(FIELDS[i]);

        for (i = 0; i < radios.length; i++) {
            radios[i].addEventListener('change', function () {
                if (tried) checkType();
                else err(wrap.querySelector('.sgfb-types'), '');
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            tried = true;

            var ok = checkType(), k, first = null;
            if (!ok && !first) first = wrap.querySelector('input[name="feedbackType"]');

            for (k = 0; k < FIELDS.length; k++) {
                if (!checkField(FIELDS[k])) {
                    ok = false;
                    if (!first) first = doc.getElementById(FIELDS[k].id);
                }
            }

            if (!ok) {
                if (first && first.focus) first.focus();
                return;
            }

            /* ------------------------------------------------------------
               NOTHING IS SENT HERE. See the header of this file. Wire this
               to an endpoint before the widget goes live, or take it down —
               the panel below tells the visitor otherwise.
               ------------------------------------------------------------ */
            var who = '';
            for (k = 0; k < radios.length; k++) if (radios[k].checked) who = radios[k].value;
            doneMsg.textContent = 'Your feedback has been recorded under ' + who +
                '. The Sachdeva Group office will be in touch if a reply is needed.';

            form.hidden = true;
            wrap.querySelector('.sgfb__head').hidden = true;
            done.hidden = false;
            done.querySelector('.mrn-btn').focus();
        });

        function reset() {
            form.reset();
            tried = false;
            form.hidden = false;
            wrap.querySelector('.sgfb__head').hidden = false;
            done.hidden = true;
            err(wrap.querySelector('.sgfb-types'), '');
            for (var k = 0; k < FIELDS.length; k++) {
                err(doc.getElementById(FIELDS[k].id).parentNode, '');
                if (FIELDS[k].area) {
                    var c = doc.getElementById(FIELDS[k].id).parentNode.querySelector('.sgfb-count b');
                    if (c) c.textContent = '0';
                }
            }
        }

        function open() {
            lastFocus = doc.activeElement;
            wrap.className = 'sgfb is-open';
            wrap.setAttribute('aria-hidden', 'false');
            btn.setAttribute('aria-expanded', 'true');
            doc.documentElement.className += ' sgfb-locked';
            if (win.lenis && win.lenis.stop) win.lenis.stop();
            /* the transition owns the first frames; focusing mid-flight makes
               the browser scroll the panel into view while it is still moving */
            win.setTimeout(function () {
                var t = wrap.querySelector('[data-sgfb-first]');
                if (t && t.focus) t.focus();
            }, 260);
        }

        function close() {
            wrap.className = 'sgfb';
            wrap.setAttribute('aria-hidden', 'true');
            btn.setAttribute('aria-expanded', 'false');
            doc.documentElement.className =
                doc.documentElement.className.replace(/\s*sgfb-locked/g, '');
            if (win.lenis && win.lenis.start) win.lenis.start();
            if (lastFocus && lastFocus.focus) lastFocus.focus();
            /* clear only once the panel is out of sight */
            win.setTimeout(reset, 420);
        }

        btn.addEventListener('click', open);

        wrap.addEventListener('click', function (e) {
            var t = e.target;
            while (t && t !== wrap) {
                if (t.hasAttribute && t.hasAttribute('data-sgfb-close')) { close(); return; }
                t = t.parentNode;
            }
        });

        doc.addEventListener('keydown', function (e) {
            if (wrap.className.indexOf('is-open') < 0) return;

            if (e.key === 'Escape' || e.keyCode === 27) { close(); return; }
            if (e.key !== 'Tab' && e.keyCode !== 9) return;

            /* focus trap — a modal the keyboard can tab out of is a modal in
               name only, and behind it sits a whole page of links */
            var f = panel.querySelectorAll(
                'button, [href], input:not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])');
            var live = [], k;
            for (k = 0; k < f.length; k++) {
                if (!f[k].disabled && f[k].offsetParent !== null) live.push(f[k]);
            }
            if (!live.length) return;

            var firstEl = live[0], lastEl = live[live.length - 1];
            if (e.shiftKey && doc.activeElement === firstEl) {
                e.preventDefault(); lastEl.focus();
            } else if (!e.shiftKey && doc.activeElement === lastEl) {
                e.preventDefault(); firstEl.focus();
            }
        });
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})(window, document);
