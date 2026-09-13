# -*- coding: utf-8 -*-
"""Wire the two yard images into sspsb and jjsb, once they are on disk.

Run from the site root:   python _apply-yard-images.py

Expects, beside this file:
    images/newsideimage.png   the sunset cutting-face photograph
    images/sspsb.png          the blue panel with the three icon chips
    images/aboutsection.png   the aerial view of the whole plot

Does four things:
  1. converts both to WebP, sized for the column they display in
  2. puts the photograph in the "Recycling at Alang" slot on both pages
  3. puts the panel in the "Yard Details" slot on both pages
  4. marks the panel's frame [data-sfx-whole] and adds the CSS that honours it,
     so the scroll bleed and the hover zoom stop cutting its icons off
  5. puts the aerial view in the "Who We Are" plate on index.html

Safe to re-run: every step checks whether it has already been applied.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

# resize=True  -> capped at 1400px, because the slot shows the whole image
# resize=False -> converted at native size: the 5:4 plate on index.html crops
#                 ~16% of the width with object-fit:cover, which magnifies the
#                 visible slice, and the source has no spare height to give.
SRC = {
    'images/newsideimage.png': ('images/alang-yard-sunset.webp',  'the sunset photograph', True),
    'images/sspsb.png':        ('images/alang-yard-details.webp', 'the icon panel',        True),
    'images/aboutsection.png': ('images/alang-yard-aerial.webp',  'the aerial view',       False),
}

missing = [s for s in SRC if not os.path.isfile(s)]
if missing:
    print('Nothing done — these are not on disk yet:')
    for m in missing:
        print('   ', m)
    sys.exit(1)


# ---------------------------------------------------------------- images ---
from PIL import Image

AERIAL = {}

for src, (dst, what, resize) in SRC.items():
    im = Image.open(src).convert('RGB')
    w, h = im.size
    # The two split slots are never displayed wider than ~780 CSS px (both live
    # in a two-column grid inside .mrn-container, max 1240 less padding), so
    # 1400 covers a retina screen and nothing beyond it.
    if resize and w > 1400:
        im = im.resize((1400, round(h * 1400 / w)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=84 if not resize else 82, method=6)
    if not resize:
        AERIAL = {'w': im.size[0], 'h': im.size[1]}
    print('  %-26s -> %-30s %dx%d  %d KB (from %d KB)'
          % (os.path.basename(src), os.path.basename(dst), im.size[0], im.size[1],
             os.path.getsize(dst) // 1024, os.path.getsize(src) // 1024))


# ------------------------------------------------------------------ html ---
PHOTO_ALT = ('Cutting crew and a material handler dismantling a beached vessel '
             'at the Alang plot at sunset')
PANEL_ALT = ('A cargo vessel moored alongside the yard crane at Alang, watched '
             'by a supervisor in a hard hat')


def patch(path, pairs):
    s = io.open(path, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    changed = 0
    for old, new, what in pairs:
        old = old.replace('\n', nl)
        new = new.replace('\n', nl)
        if new in s:
            print('  %s: %s already applied' % (path, what))
            continue
        assert old in s, '%s: could not find %s' % (path, what)
        assert s.count(old) == 1, '%s: %s is not unique' % (path, what)
        s = s.replace(old, new, 1)
        changed += 1
    if changed:
        io.open(path, 'w', encoding='utf-8', newline='').write(s)
        print('  %s: %d slot(s) updated' % (path, changed))


for page in ('sspsb.html', 'jjsb.html'):
    patch(page, [
        # --- the photograph keeps data-drift-img: edges are incidental on a
        #     photo, and the bleed is doing exactly what it is for.
        ("""<img loading="lazy" decoding="async" src="images/s3.webp"
                                alt="Laden container vessel under way">""",
         """<img loading="lazy" decoding="async" src="images/alang-yard-sunset.webp"
                                alt="%s">""" % PHOTO_ALT,
         'profile photograph'),

        # --- the panel does NOT. data-drift-img is swapped for data-sfx-whole
        #     so js/scroll-drift.js never claims it and the CSS below holds it
        #     still; its icons sit ~7% in from the left edge and the bleed ate
        #     them.
        ("""<div class="mrnp-split__frame" data-drift-img data-sfx-open>
                            <img loading="lazy" decoding="async" src="images/container.webp" alt="Shipping container">""",
         """<div class="mrnp-split__frame" data-sfx-whole data-sfx-open>
                            <img loading="lazy" decoding="async" src="images/alang-yard-details.webp"
                                alt="%s">""" % PANEL_ALT,
         'yard-details panel'),
    ])


# --- and the aerial, into the "Who We Are" plate on index.html -------------
# The width/height attributes are rewritten to the file's real size. They do
# not drive layout here (the img is position:absolute, inset:0, object-fit
# cover) but a wrong intrinsic size is a lie the browser may act on later.
AERIAL_ALT = ('The Sachdeva Group plot at Alang from above: vessels under '
              'dismantling along the tideline, the yard crane, and the plate '
              'deck behind it')

patch('index.html', [
    ("""<img src="images/gallery/5.jpg" width="1152" height="648" loading="lazy" decoding="async"
                                alt="Vessels beached for dismantling beside the plate deck at the Sachdeva Group yard, Alang">""",
     """<img src="images/alang-yard-aerial.webp" width="%d" height="%d" loading="lazy"
                                decoding="async"
                                alt="%s">""" % (AERIAL['w'], AERIAL['h'], AERIAL_ALT),
     'Who We Are aerial'),
])


# ------------------------------------------------------------------- css ---
p = 'css/scroll-fx.css'
s = io.open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'

if 'data-sfx-whole' in s:
    print('  %s: opt-out rule already present' % p)
else:
    anchor = '/* --- 3.2 gallery tiles ----------------------------------------------------- */'.replace('\n', nl)
    block = """/* --- 3.1b composed panels: shown whole, never zoomed -----------------------
   Everything above assumes the picture in a frame is a PHOTOGRAPH. Edges are
   incidental there, so the image is deliberately oversized — 1.24 at rest to
   give the +/-10% scroll slide somewhere to go, x1.14 again while the box
   opens, 1.26 on hover — and nothing that matters lives in the ~10-15% that
   eats off each side.

   That assumption is wrong for an image that is a COMPOSED PANEL: a graphic
   with icons, labels or a border laid into it at fixed positions. The
   yard-details panel carries three icon chips about 7% in from its left edge,
   so the rest bleed already clipped them and the hover zoom cut them off
   altogether — the picture was being treated as a texture when it is a layout.

   [data-sfx-whole] on the frame says which kind it is: no bleed, no slide, no
   hover zoom. The frame keeps its border, its tag and the saturation change,
   so the panel still answers the pointer like everything else on the page —
   it just does not move, because there is nothing spare to move into.

   Pair it with REMOVING data-drift-img from the same frame. js/scroll-drift.js
   collects that attribute and writes the scale as an inline GSAP transform,
   and an inline style beats every rule in this file.
   -------------------------------------------------------------------------- */

[data-sfx-whole] img,
.mrnp-split__media:hover [data-sfx-whole] img,
.mrnp-split__frame[data-sfx-whole]:hover img {
    --sfx-iz: 1;
    --sfx-io: 1;
    transform: none;
}

""".replace('\n', nl)
    assert anchor in s, 'css anchor missing'
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(anchor, block + anchor, 1))
    print('  %s: composed-panel opt-out added' % p)

print('\nDone. Hard-refresh (Ctrl+F5) — css/js are cached for an hour.')
