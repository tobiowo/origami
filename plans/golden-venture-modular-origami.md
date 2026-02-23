# Plan: Golden Venture Modular Origami (3D Origami)

## Goal
Build a two-part app for Golden Venture Folding (GVF):
1. **Folding Tutorial** — Interactive step-by-step guide showing how to fold a single GVF unit (similar to existing Sonobe folding page, using OrigamiSimulator).
2. **3D Assembly Viewer** — A Three.js-based viewer that renders assembled GVF models (vases, swans, etc.) in 3D from a row-based data format.

---

## 1. Background

Golden Venture Folding, also known as "3D Origami" or "Chinese Paper Folding," is a modular origami technique where hundreds of identical triangular units are interlocked to create sculptures. Units are stacked and interlocked like bricks in rows that form rings, allowing for organic, curved, and representational forms (swans, pineapples, vases).

Named after the cargo ship *Golden Venture* (1993) — detained immigrants created thousands of these sculptures during years of detention.

## 2. The Basic Unit

### 2.1 Paper Geometry
*   **Standard Ratios:** Typically 1:1.5 or 1:2.
*   **A4 Division:** Dividing A4 into 32 pieces (4x8 grid) → ~37mm x 52.5mm (~1:1.42).
*   **Anatomy:**
    *   **Points (Tabs):** Two sharp points at the top.
    *   **Pockets (Slots):** Two openings at the base where other units' points insert.

### 2.2 Folding Sequence (8 steps)
1.  Fold rectangle in half lengthwise.
2.  Fold in half widthwise to find center, then unfold.
3.  Fold top two corners down to center crease (house shape).
4.  Flip over.
5.  Fold bottom rectangular flaps up.
6.  Fold small outer corners of flaps in.
7.  Fold entire bottom flap section up to form triangle.
8.  Fold triangle in half along vertical center.

## 3. Assembly Techniques

### 3.1 Primary Connection Types
*   **Standard (Brick-Laying):** Both points of one unit insert into pockets of two *different* units below. Creates the offset brick pattern. This is 90%+ of all connections.
*   **Aligned:** Both points insert into the two pockets of a *single* unit below. Creates "sticks"/chains (e.g., swan necks). Can curve into arcs or closed rings.

### 3.2 Increasing Row Size (Expansion)
*   **Floating:** Unit placed between two standard units with both pockets empty. Secured by row above.
*   **Hanging (Outwards):** One pocket filled, one hangs off the side. Used in pairs, empty pockets facing outward.
*   **Hanging (Inwards):** One pocket filled, empty pocket hangs between the points below. Used in pairs, filled pockets adjacent.

### 3.3 Decreasing Row Size (Contraction)
*   **Shrinking:** Used in pairs. 3 units in row below → 2 units in current row. Each shrinking unit captures 3 points instead of the normal 2.

### 3.4 Orientation
*   **Normal (Mountain):** Long triangle edge faces outward.
*   **Inverted:** Flipped so "split" side (pockets) faces outward — different texture.

### 3.5 Row Alignment
*   **Offset:** Standard brick-laying (odd/even rows shifted by half unit).
*   **Straight:** Units stacked directly above each other (uses Aligned connection).

## 4. Reference Implementation Analysis

### 4.1 Golden Venture Art Designer (goldenventureart.com/designer)

**Findings from live exploration (2026-02-16):**

*   **Tech Stack:** Next.js app.
*   **Rendering:** Uses **HTML Canvas** (NOT SVG as previously assumed). Full-width canvas element renders the 2D row editor.
*   **UI:** Toolbar with: Help, Share, Part List, Piece Stats, Delete Row, Add Row, Change Orientation, Change Alignment. Color palette (6 configurable colors). Piece type selectors: standard, hanging, shrinking, floating, surrounding, space.
*   **Row editing:** Select a row → shows "Size: N" with -5/-1/+1/+5 buttons. Rows numbered bottom-up.
*   **Gallery models:** Diamond-pattern cup, Vase with flower, Swan, GreatBall (Pokeball). Gallery is photo-only, not linked to designer.

### 4.2 URL Data Encoding (decoded from Share button)

Format: Base64-encoded string in `?layout=` query param.

**Decoded example** (9 rows of 6 blue units):
```
V2a#0000FF-b#FF0000-c#008000-d#000000-e#FFFFFF-f#800080>Default<Z:Aa6|X:Aa6|Z:Aa6|X:Aa6|Z:Aa6|X:Aa6|Z:Aa6|X:Aa6|Z:Aa6
```

**Structure:**
- `V2a` — format version
- `#0000FF-b#FF0000-c#008000-d#000000-e#FFFFFF-f#800080` — color palette (keys a-f → hex colors)
- `>Default<` — part name delimiter (multi-part models have multiple `>Name<...` sections)
- `Z:Aa6|X:Aa6|...` — rows separated by `|`
  - `Z` or `X` — row alignment flag (alternates for offset pattern; Z=offset, X=straight? **[NEEDS INVESTIGATION]**)
  - `A` — piece specialty type (A=standard, others TBD **[NEEDS INVESTIGATION]**)
  - `a` — color key (references palette)
  - `6` — count of consecutive same-color/same-type pieces

**Run-length encoding:** Within a row, consecutive pieces of the same type+color are compressed. E.g., `Aa6` = 6 standard blue pieces. A row with mixed colors might look like `Aa3Ab2Ac1` (3 blue, 2 red, 1 green).

### 4.3 Piece Specialties (from toolbar)
Six types identified: `STANDARD`, `HANGING`, `SHRINKING`, `FLOATING`, `SURROUNDING`, `SPACE`.

**[NEEDS INVESTIGATION]:** What is `SURROUNDING`? What is `SPACE`? These aren't described in the Techniques page. Possibly: SURROUNDING = a unit that wraps around another (for bases?), SPACE = an empty gap in the row.

### 4.4 What the Reference App Does NOT Have (our opportunity)
The existing Golden Venture Art Designer is **2D only** — it's a flat row editor like a knitting chart. It does not:
- Show what the assembled model looks like in 3D
- Visualize how rows form rings/curves
- Provide folding instructions for the unit itself

Our app will fill both gaps: teach folding AND render assemblies in 3D.

## 5. Data Model for Our App

### 5.1 Assembly Format (JSON)
We need more metadata than the reference app to drive 3D rendering.

```jsonc
{
  "version": 1,
  "name": "Simple Vase",
  "colorPalette": {
    "a": "#0000FF",
    "b": "#FF0000"
    // ...
  },
  "parts": {
    "body": {
      "type": "ring",        // "ring" (closed loop) or "strip" (open chain)
      "rows": [
        {
          "alignment": "offset",  // "offset" or "straight"
          "pieces": [
            { "type": "standard", "color": "a", "count": 20 }
          ]
        },
        {
          "alignment": "offset",
          "pieces": [
            { "type": "standard", "color": "b", "count": 10 },
            { "type": "standard", "color": "a", "count": 10 }
          ]
        }
        // ...
      ]
    },
    "neck": {
      "type": "strip",
      "attachTo": { "part": "body", "row": 10, "pieceIndex": 5 },
      "rows": [
        { "alignment": "straight", "pieces": [{ "type": "aligned", "color": "a", "count": 1 }] }
        // ...
      ]
    }
  }
}
```

### 5.2 Additional 3D Metadata Beyond Reference App

**[NEEDS INVESTIGATION]** — These are the hard problems for 3D rendering:

1. **Ring radius per row:** How does piece count map to radius? Each unit has a physical width; for N units in a ring, `radius ≈ N * unitWidth / (2 * PI)`. But the actual radius depends on how tightly units interlock.
2. **Unit tilt angle:** In a cylindrical section, units tilt outward/inward to form the surface. When row count changes (expansion/contraction), the tilt changes to create curvature (like a vase narrowing). Need to derive tilt from row-count deltas.
3. **Row height:** Physical height of one row of units when interlocked. Roughly constant but affected by unit dimensions.
4. **Part attachment transforms:** How to position sub-assemblies (neck on body). Needs `Matrix4` or position+rotation.

### 5.3 Compatibility with Reference App
We should support **importing** the reference app's Base64 URL format for testing. This lets us:
- Encode a model in their designer
- Load it in our 3D viewer
- Verify our rendering is geometrically correct

Conversion: decode Base64 → parse `V2a...` format → map to our JSON schema (adding default 3D metadata like ring type + auto-calculated radius).

## 6. Common Models (for testing)

*   **Simple Vase/Cup:** Single ring part, constant row count (~20 units), 5-10 rows. Good first test.
*   **Pineapple/Vase with curvature:** Ring with varying row counts (expand then contract). Tests radius changes.
*   **Swan:** Body (ring) + Neck (strip, curved) + Tail (strip, flat) + Wings (strips, flat). Tests multi-part assembly.
*   **GreatBall (Pokeball):** Spherical — rows expand to equator then contract. Tests full curvature.

## 7. Development Strategy

### Phase 1: Single Unit Folding Tutorial
*   **Goal:** Interactive page teaching how to fold one GVF unit.
*   **Approach:** Same pattern as existing Sonobe folding page — OrigamiSimulator with step-by-step FOLD patterns + slider.
*   **Deliverables:**
    1.  `golden-venture-unit.html` — standalone page
    2.  `js/golden-venture-steps.js` — FOLD patterns for each folding step
    3.  Step descriptions + slider UI
*   **[NEEDS INVESTIGATION]:** Generating correct FOLD geometry for the 8-step sequence. The unit has overlapping layers (flaps folded over), which is harder than Sonobe. May need to simplify (fewer steps, or approximate the folded shape) or use a hardcoded 3D mesh for the final folded unit.

### Phase 2: 3D Assembly Viewer (Simple Cylinder)
*   **Goal:** Render a basic cylindrical ring of GVF units in 3D.
*   **Deliverables:**
    1.  `golden-venture-viewer.html` — standalone Three.js page
    2.  `js/gv-unit-mesh.js` — hardcoded triangular unit geometry (not FOLD-simulated; a simple 3D mesh of the folded unit shape)
    3.  `js/gv-assembly.js` — ring positioning logic: given N units, compute position + rotation for each unit in a circle
    4.  UI: row count slider, radius display, orbit controls
*   **Key math:** For N units in a ring of radius R:
    - Angular spacing: `2*PI / N`
    - Each unit placed at `(R*cos(θ), y, R*sin(θ))` rotated to face outward
    - Unit tilt = 0 for straight cylinder walls
*   **Performance:** Use `THREE.InstancedMesh` with per-instance color. 500+ units must render smoothly.

### Phase 3: Multi-Row Stacking + Curvature
*   **Goal:** Stack multiple rows, handle expansion/contraction, render vase-like shapes.
*   **Deliverables:**
    1.  Row stacking with correct height offset
    2.  Offset alignment (brick pattern) between rows — each row rotated by half-unit angular width
    3.  Radius auto-calculation from piece count
    4.  Tilt angle computation for curved surfaces
    5.  Support inverted unit orientation
*   **[NEEDS INVESTIGATION]:** The tilt angle math. When a vase narrows from 20 to 18 units, the units in the transition rows tilt inward. Need to figure out the geometry — possibly derive from the angle between consecutive row radii and row height.

### Phase 4: Advanced Assembly Features
*   **Goal:** Implement all piece specialty types + multi-part models.
*   **Deliverables:**
    1.  Floating, Hanging (in/out), Shrinking piece placement
    2.  Multi-part assembly with attachment transforms
    3.  Import from Golden Venture Art Designer URL format
    4.  Gallery of preset models (vase, swan, etc.)

### Phase 5: Integration with Main App
*   **Goal:** Merge into the main origami teaching app.
*   **Actions:**
    1.  Add navigation link from main app
    2.  Follow existing bootstrap.js pattern (vanilla HTML/JS, Three.js r182 via ES modules)
    3.  Consistent UI styling with existing pages

## 8. Open Questions / Investigation Needed

1.  **Z vs X row flags** in the reference app encoding — what exactly do they control? Need to create multi-row models with different alignments and compare.
2.  **Piece specialty encoding** — what single-character codes map to STANDARD, HANGING, SHRINKING, FLOATING, SURROUNDING, SPACE? Need to create rows with each type and decode the URL.
3.  **SURROUNDING and SPACE types** — not documented on the Techniques page. Need experimentation or source code analysis.
4.  **Unit 3D mesh dimensions** — need precise measurements of a folded GVF unit (height, width, depth, tab length, pocket depth) to build accurate geometry. Could measure from a physical unit or derive from paper ratio.
5.  **Tilt angle math for curvature** — how exactly to compute the outward/inward tilt when row count changes between adjacent rows.
6.  **FOLD representation feasibility** — is it worth simulating the 8-step fold in OrigamiSimulator, or should Phase 1 use a simplified approach (fewer steps, or pre-rendered images + a final 3D mesh)?
7.  **Row interlock depth** — how far do tabs insert into pockets? This affects the effective row height and overall model proportions.

## 9. References
*   [Golden Venture Art Designer](https://goldenventureart.com/designer/) — 2D row editor (Canvas-based, Next.js)
*   [Golden Venture Art Gallery](https://goldenventureart.com/gallery/) — Photo gallery of models
*   [Golden Venture Art Techniques](https://goldenventureart.com/techniques/) — Assembly technique descriptions with 3D illustrations
*   [Origami Resource Center - Golden Venture Folding](https://origami-resource-center.com/golden-venture-folding/)
