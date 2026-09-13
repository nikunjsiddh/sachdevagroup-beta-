/* ==========================================================================
   CONTACT — the enquiry form
   ==========================================================================
   The form on contact_us.html shipped with action="" and a type="button"
   submit. It looked finished, validated nothing and posted nowhere: every
   enquiry typed into it was discarded the moment the page changed. This is
   what makes it a form.

   Posts to contact-send.php, which re-validates everything here and does not
   trust a byte of it. What this file is for is the person filling the form
   in — telling them which field is wrong before a round trip, and telling
   them plainly what happened after one.

   XMLHttpRequest rather than fetch, and no arrow functions or template
   literals, because the rest of this site is ES5 and the browsers it is built
   for are the ones without fetch.
   ========================================================================== */

(function (win, doc) {
    'use strict';

    var form = doc.getElementById('enquiry');
    if (!form) return;

    var ENDPOINT = 'contact-send.php';

    /* Each field: the id, whether it is required, and the rule that decides.
       Kept as data so the markup and the checks cannot drift apart. */
    var FIELDS = [
        {
            id: 'fname', label: 'first name', required: true,
            test: function (v) {
                if (v.length < 2) return 'Please enter your first name.';
                if (!/^[A-Za-zÀ-ÿ' .-]+$/.test(v)) return 'Letters, spaces, . \' and - only.';
                return '';
            }
        },
        {
            id: 'lname', label: 'last name', required: false,
            test: function (v) {
                if (v && !/^[A-Za-zÀ-ÿ' .-]+$/.test(v)) return 'Letters, spaces, . \' and - only.';
                return '';
            }
        },
        {
            id: 'email', label: 'email', required: true,
            /* Deliberately loose. The only authority on whether an address
               works is the mail server; a clever regex here just rejects
               valid addresses that happen to be unusual. */
            test: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
                    ? '' : 'Please enter a valid email address.';
            }
        },
        {
            id: 'phone', label: 'phone', required: true,
            test: function (v) {
                var d = v.replace(/\D/g, '');
                if (d.length < 7 || d.length > 15) return 'Enter a phone number of 7 to 15 digits.';
                return '';
            }
        },
        {
            id: 'message', label: 'message', required: true,
            test: function (v) {
                if (v.length < 10) return 'Please tell us a little more — at least 10 characters.';
                if (v.length > 1500) return 'That is longer than 1500 characters.';
                return '';
            }
        }
    ];

    var tried = false;          /* no red until they have tried once */
    var sending = false;

    /* ----------------------------------------------------------------------
       Messages under a field, and the one across the top
       ---------------------------------------------------------------------- */

    function noteFor(el) {
        var wrap = el.parentNode;
        var n = wrap.querySelector('.mrnp-field__err');
        if (!n) {
            n = doc.createElement('span');
            n.className = 'mrnp-field__err';
            wrap.appendChild(n);
        }
        return n;
    }

    function mark(el, msg) {
        var wrap = el.parentNode;
        noteFor(el).textContent = msg || '';
        if (msg) {
            wrap.className = wrap.className.replace(/\s*is-bad/g, '') + ' is-bad';
            el.setAttribute('aria-invalid', 'true');
        } else {
            wrap.className = wrap.className.replace(/\s*is-bad/g, '');
            el.removeAttribute('aria-invalid');
        }
    }

    var alertBox = null;
    function alertMsg(msg, kind) {
        if (!alertBox) {
            alertBox = doc.createElement('p');
            alertBox.className = 'mrnp-form__alert';
            alertBox.setAttribute('role', 'alert');
            form.insertBefore(alertBox, form.firstChild.nextSibling);
        }
        alertBox.textContent = msg || '';
        alertBox.className = 'mrnp-form__alert' + (kind ? ' is-' + kind : '');
        alertBox.hidden = !msg;
    }

    /* ----------------------------------------------------------------------
       Validation
       ---------------------------------------------------------------------- */

    function value(f) {
        var el = doc.getElementById(f.id);
        return el ? el.value.trim() : '';
    }

    function checkOne(f) {
        var el = doc.getElementById(f.id);
        if (!el) return '';
        var v = el.value.trim();
        var msg = (!v && f.required) ? 'Please enter your ' + f.label + '.' : (v ? f.test(v) : '');
        if (tried) mark(el, msg);
        return msg;
    }

    function checkAll() {
        var firstBad = null;
        for (var i = 0; i < FIELDS.length; i++) {
            if (checkOne(FIELDS[i]) && !firstBad) firstBad = doc.getElementById(FIELDS[i].id);
        }
        return firstBad;
    }

    /* live correction, but only once they have been told there is a problem */
    for (var i = 0; i < FIELDS.length; i++) {
        (function (f) {
            var el = doc.getElementById(f.id);
            if (!el) return;
            el.addEventListener('input', function () { if (tried) checkOne(f); });
            el.addEventListener('blur', function () { if (tried) checkOne(f); });
        })(FIELDS[i]);
    }

    /* ----------------------------------------------------------------------
       The sent panel
       ----------------------------------------------------------------------
       The shell is a fixed literal; every value that came off the wire goes in
       through textContent below it, never through innerHTML.
       ---------------------------------------------------------------------- */

    function sent(message) {
        var box = doc.createElement('div');
        box.className = 'mrnp-form__done';
        box.setAttribute('role', 'status');
        box.setAttribute('tabindex', '-1');
        box.innerHTML =
            '<span class="mrnp-form__tick" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
              'stroke-linecap="round" stroke-linejoin="round" focusable="false">' +
              '<path d="m4.5 12.5 5 5 10-11"/></svg>' +
            '</span>' +
            '<h3></h3><p></p>' +
            '<button type="button" class="mrn-btn mrn-btn--ghost">Send another</button>';

        box.querySelector('h3').textContent = 'Thank you — your enquiry is on its way.';
        box.querySelector('p').textContent = message;

        form.parentNode.insertBefore(box, form);
        form.hidden = true;

        box.querySelector('button').addEventListener('click', function () {
            box.parentNode.removeChild(box);
            form.reset();
            form.hidden = false;
            tried = false;
            alertMsg('');
            for (var k = 0; k < FIELDS.length; k++) {
                var el = doc.getElementById(FIELDS[k].id);
                if (el) mark(el, '');
            }
            var first = doc.getElementById('fname');
            if (first) first.focus();
        });

        box.focus();
    }

    /* ----------------------------------------------------------------------
       Submit
       ---------------------------------------------------------------------- */

    function submit() {
        if (sending) return;
        tried = true;

        var bad = checkAll();
        if (bad) {
            alertMsg('Please check the fields marked below.', 'bad');
            bad.focus();
            return;
        }
        alertMsg('');

        var btn = form.querySelector('button[type=submit], .mrn-btn');
        var restore = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
        sending = true;

        function done(err) {
            sending = false;
            if (btn) { btn.disabled = false; btn.innerHTML = restore; }
            if (err) alertMsg(err, 'bad');
        }

        var cc = doc.getElementById('country_code');
        var pairs = [
            ['fname', value(FIELDS[0])],
            ['lname', value(FIELDS[1])],
            ['email', value(FIELDS[2])],
            ['country_code', cc ? cc.value : '+91'],
            ['phone', value(FIELDS[3])],
            ['message', value(FIELDS[4])]
        ];

        var body = [];
        for (var k = 0; k < pairs.length; k++) {
            body.push(encodeURIComponent(pairs[k][0]) + '=' + encodeURIComponent(pairs[k][1]));
        }

        var xhr = new win.XMLHttpRequest();
        xhr.open('POST', ENDPOINT, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.timeout = 25000;

        xhr.onload = function () {
            var res = null;
            try { res = JSON.parse(xhr.responseText); } catch (e) {}

            if (res && res.ok) {
                done('');
                /* The server sends wording of its own when it has to differ —
                   the enquiry reached the office but the email did not go
                   out, which is a success and must not read like a failure. */
                sent((res.message && typeof res.message === 'string') ? res.message
                    : 'A copy has gone to the Sachdeva Group office and a confirmation is on '
                    + 'its way to you. We will be in touch shortly.');
                return;
            }

            /* The server's message is shown as-is when it sent one: it is the
               field-level reason the post was rejected and it is more use than
               a generic failure. textContent, so it is text and not markup. */
            done((res && res.error) ? res.error
                : 'Could not send just now. Please call +91 278 2429573 or email info@sachdevagroup.in.');
        };

        xhr.onerror = function () { done('No connection. Please check your network and try again.'); };
        xhr.ontimeout = function () { done('That took too long. Please try again, or call +91 278 2429573.'); };

        xhr.send(body.join('&'));
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

    /* The markup ships a type="button", which never raises submit. Claim it
       here as well, so the form works whichever way the button is spelled. */
    var btn = form.querySelector('.mrn-btn');
    if (btn && btn.getAttribute('type') !== 'submit') {
        btn.addEventListener('click', function (e) { e.preventDefault(); submit(); });
    }

})(window, document);
