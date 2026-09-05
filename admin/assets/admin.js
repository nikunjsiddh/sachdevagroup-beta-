/* ==========================================================================
   SACHDEVA GROUP — admin panel behaviour
   ==========================================================================
   Four small things: the drawer on narrow screens, a confirmation before
   anything destructive, the filename list under the gallery upload, and a
   guard against double-submitting a form.

   Everything in the panel works with this file absent. It is progressive
   enhancement, not the application: the drawer is only needed below 900px,
   the confirmation is a courtesy over a POST that is already deliberate, and
   the double-submit guard is belt to the server's own braces.
   ========================================================================== */

(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       1. The sidebar drawer
       ---------------------------------------------------------------------- */

    var burger = document.getElementById('burger');
    var scrim = document.getElementById('scrim');
    var side = document.getElementById('side');

    function setNav(open) {
        document.body.classList.toggle('nav-open', open);
        if (scrim) scrim.hidden = !open;
        if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');

        /* Off-canvas is still in the tab order, so a closed drawer would sit
           between the burger and the page content for anyone using the
           keyboard. inert removes it from the tree entirely; the hidden
           attribute cannot be used because the drawer animates. */
        if (side && 'inert' in HTMLElement.prototype) {
            side.inert = !open && window.matchMedia('(max-width: 900px)').matches;
        }
    }

    if (burger) {
        burger.addEventListener('click', function () {
            setNav(!document.body.classList.contains('nav-open'));
        });
    }
    if (scrim) scrim.addEventListener('click', function () { setNav(false); });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setNav(false);
    });

    /* A drawer left open while the window grows back to desktop keeps the
       scrim over a sidebar that is now permanently visible. */
    var wide = window.matchMedia('(min-width: 901px)');
    var onWide = function (m) { if (m.matches) setNav(false); else setNav(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);

    setNav(false);

    /* ----------------------------------------------------------------------
       2. Confirm before anything that cannot be undone
       ----------------------------------------------------------------------
       Bound on the form rather than the button so it fires however the form
       was submitted — including Enter from a field inside it.
    ---------------------------------------------------------------------- */

    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || !form.getAttribute) return;

        var ask = form.getAttribute('data-confirm');
        if (ask && !window.confirm(ask)) {
            e.preventDefault();
            return;
        }

        /* ------------------------------------------------------------------
           3. One submit per form
           ------------------------------------------------------------------
           An impatient second click on "Add article" posts the form twice and
           creates two rows. The button is disabled after the event has been
           allowed through — disabling it during the handler would drop its
           name from the submitted data on some browsers.

           The re-enable matters as much as the disable: coming back to this
           page through the history cache (Safari, and Firefox's bfcache)
           restores the DOM exactly as it was left, disabled button included,
           and the form would then be dead with nothing to explain it.
        ------------------------------------------------------------------ */

        if (form.hasAttribute('data-no-guard')) return;

        var buttons = form.querySelectorAll('button[type=submit], button:not([type])');
        window.setTimeout(function () {
            Array.prototype.forEach.call(buttons, function (b) {
                b.disabled = true;
                b.dataset.wasEnabled = '1';
            });
        }, 0);
    });

    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        Array.prototype.forEach.call(
            document.querySelectorAll('button[data-was-enabled]'),
            function (b) { b.disabled = false; }
        );
    });

    /* ----------------------------------------------------------------------
       4. The gallery upload
       ----------------------------------------------------------------------
       Names what was chosen, because a multiple file input reports only
       "6 files" and there is no way to tell which six.
    ---------------------------------------------------------------------- */

    var input = document.getElementById('dropInput');
    var picked = document.getElementById('dropPicked');
    var drop = document.getElementById('drop');

    function describe(files) {
        if (!files || !files.length) {
            if (picked) picked.hidden = true;
            return;
        }
        var names = [];
        for (var i = 0; i < files.length && i < 12; i++) names.push(files[i].name);
        if (files.length > 12) names.push('and ' + (files.length - 12) + ' more');

        picked.textContent = files.length + (files.length === 1 ? ' file: ' : ' files: ')
            + names.join(', ');
        picked.hidden = false;
    }

    if (input && picked) {
        input.addEventListener('change', function () { describe(input.files); });
    }

    /* Dropping onto the card, for anyone who expects that to work. DataTransfer
       is what lets the dropped list be handed to the file input; without it
       (older Safari) the drop is simply ignored and the button still works. */
    if (drop && input && window.DataTransfer) {
        ['dragenter', 'dragover'].forEach(function (ev) {
            drop.addEventListener(ev, function (e) {
                e.preventDefault();
                drop.classList.add('is-over');
            });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
            drop.addEventListener(ev, function (e) {
                e.preventDefault();
                if (ev === 'dragleave' && drop.contains(e.relatedTarget)) return;
                drop.classList.remove('is-over');
            });
        });
        drop.addEventListener('drop', function (e) {
            var files = e.dataTransfer && e.dataTransfer.files;
            if (!files || !files.length) return;

            var dt = new DataTransfer();
            for (var i = 0; i < files.length; i++) {
                if (/^image\//.test(files[i].type)) dt.items.add(files[i]);
            }
            if (!dt.files.length) return;

            input.files = dt.files;
            describe(input.files);
        });
    }
})();
