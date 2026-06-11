# The Keel Unit — an original open-frame modular origami unit

## Why this unit

The app covers two modular genres: Sonobe (solid, spiked polyhedra) and Golden
Venture (stacked scales). The third classic genre — **open-frame ("wireframe")
polyhedra**, where edge units form struts and the faces are left as holes — is
missing, and with it pentagon-based models like the dodecahedron.

The Keel unit is an app-original design in that genre. It is a descendant of
Robert Neale's **Penultimate module** and Tom Hull's **PHiZZ unit** (the
canonical open-frame edge units); the fold sequence, sleeve-pocket lock, and
proportions here are our own.

## The unit

Paper: a **3:1 rectangle** (cut an A-series sheet or square into thirds).

1. **Center crease** — fold in half lengthwise and open (reference).
2. **Sleeve fold** — fold both long edges to the center crease (cupboard
   fold). The two flaps form the **sleeve**: a slit runs the length of the
   strip, with a pocket under each flap.
3. **Miter the ends** — fold each end back along a diagonal crease through
   the bottom corner. The miter angle sets which polygon the unit frames:
   - **54°** → pentagons (dodecahedron)
   - **45°** → squares (cube)
   - **30°** → triangles (tetrahedron, octahedron, icosahedron)
   The folded-back wedges become the **tabs**.
4. **Keel fold** — fold the whole strip in half lengthwise, away from you.
   The mountain ridge (the "keel") becomes the outer crest of the strut.

Assembly: each unit lies along one polyhedron edge. Its mitered tab slides
into the sleeve slit of the next unit around the face corner; with the right
miter angle the units close into polygon frames, and frames share struts to
form the polyhedron. Faces stay open — the model is a lattice.

## Geometry (paper space 3 × 1, used by js/keel-fold-model.js)

- Strip after the sleeve fold: y ∈ [0.25, 0.75], slit at y = 0.5.
- Pentagon miter crease (left end): from (0, 0.25) to (DX, 0.75) where
  `DX = 0.5 / tan 54° ≈ 0.36327`. (Curiously, the crease length is
  `sqrt(DX² + 0.25) = 0.61803 = 1/φ` — a golden-ratio cameo befitting
  the pentagon.)
- Folded-back left tab: triangle [(0, 0.25), (DX, 0.75), (0.47553, 0.40451)]
  (the third point is the reflection of (0, 0.75) across the crease).
- The keel fold halves the strip at y = 0.5; the finished unit's silhouette
  is 3 long and 0.25 tall with up to six paper layers near the tabs.

## Assembly math (js/keel-assembly.js)

For a polyhedron (vertices, faces), one unit per edge:
- Each face contributes a **wing**: the band of the face within `inset` of
  the edge, trimmed at the corners by the angle bisectors (the inset-polygon
  construction). This is exactly the visible half of a unit's V.
- The crest of the strut is the polyhedron edge lifted slightly along the
  mean normal of its two faces, giving each strut its tent profile.
- Frames offered: single pentagon (5), tetrahedron (6), cube (12),
  octahedron (12), dodecahedron (30), icosahedron (30). The dodecahedron's
  vertices/faces are derived as the dual of the icosahedron.

## Sources consulted

- Genre survey and unit taxonomy: origami.kosmulski.org (modular types,
  Simple Edge Unit, Sturdy Edge Module)
- Sonobe deltahedra structure: en.wikipedia.org/wiki/Sonobe
- Penultimate module (Robert Neale) and PHiZZ unit (Tom Hull) background:
  polypompholyx.com modular origami survey, matthewdeutsch.com PHiZZ torus
