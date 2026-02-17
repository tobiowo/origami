# Three.js Migration Plan: r110 → r182

This document outlines the strategic plan to upgrade the Three.js dependency from version r110 to the latest stable version (r182).

---

## 1. Executive Summary

The main app loads Three.js r110 from CDN and uses it as a global (`window.THREE`). App code (`js/app.js`, `js/assembly-view-v2.js`, etc.) is already ES-module based and uses modern `BufferGeometry` throughout — so the **app-side migration is straightforward**.

The critical dependency is **`origami-simulator.js`** — a bundled third-party library ([amandaghassaei/OrigamiSimulator](https://github.com/amandaghassaei/OrigamiSimulator)) that runs on **Three.js r87** (2017). It contains ~700 lines of GPGPU shaders in GLSL ES 1.0 and uses the now-removed `THREE.Geometry` class in its export code. The upstream repo is still active (last commit Nov 2025) but has no build system — it's plain JS files, which actually makes forking and patching straightforward.

---

## 2. The origami-simulator Problem (Critical Path)

### Current State

`js/lib/origami-simulator.js` is a pre-built 149KB bundle from the upstream repo. It:
- Depends on **Three.js r87** (bundled in upstream's `dependencies/` folder)
- Expects `window.THREE` (falls back to `require("three")`)
- Contains 12 GPGPU shaders using deprecated GLSL ES 1.0 syntax
- Uses the removed `THREE.Geometry` and `THREE.Face3` classes in export code (`saveSTL.js`, `saveFOLD.js`)
- Has its own raw WebGL compute layer (`GPUMath.js`) that is **independent of Three.js** and won't break

### Upstream Audit (references/OrigamiSimulator)

The upstream repo has **no build system** — just plain JS files loaded via `<script>` tags. All 12 shaders are inline in `index.html`. This means a fork-and-patch approach is viable without needing to reverse-engineer a build pipeline.

| Component | Files | Effort | Risk |
|-----------|-------|--------|------|
| **Shader syntax** (12 shaders, ~700 LOC in `index.html`) | 1 file | Moderate (~5h) | Medium — two physics shaders are 200+ lines; errors cause silent simulation failures |
| **Remove `THREE.Geometry`** | `saveSTL.js`, `saveFOLD.js` | Hard (~4h) | Medium — must rewrite to read from `BufferGeometry` directly |
| **Constants/materials** (`THREE.VertexColors`, etc.) | `model.js` | Trivial (~30min) | Low |
| **Controls/loaders** | `TrackballControls.js`, `SVGLoader.js` | Moderate (~2h) | Low |
| **Raw WebGL layer** (`GPUMath.js`, `GLBoilerplate.js`) | — | **No changes needed** | None — independent of Three.js |

**Estimated total for upstream fork: ~15-20 hours**

### Decided Approach: Patch the Bundle Directly

The upstream repo is a **full app** (40+ script tags, jQuery, underscore, etc.), not a library. The UMD bundle at `js/lib/origami-simulator.js` was hand-curated to extract just the simulation core. There is no upstream build config to reproduce it.

**Strategy:**
1. **Patch `js/lib/origami-simulator.js` directly** — it's unminified and readable (3640 lines)
2. **Maintain a fork** of `amandaghassaei/OrigamiSimulator` for eventual PR back upstream
3. **Document the base commit** in a comment at the top of the patched bundle
4. A submodule + build pipeline can be added later if upstream becomes more active

This avoids inventing build infrastructure for a dependency that rarely changes, while keeping the door open for contributing patches back.

---

## 3. Breaking Changes Relevant to This App

### A. Rendering Engine (High Impact)
*   **Mandatory WebGL 2:** `WebGLRenderer` now requires WebGL 2. All modern browsers support this.
*   **Shader Migration:** Only affects `origami-simulator.js` (see Section 2). No custom shaders in app code.

### B. Color & Lighting (Low Impact)
*   **Color Management:** `outputColorSpace` replaces `outputEncoding`. Need to set `renderer.outputColorSpace = THREE.SRGBColorSpace`.
*   **Physical Lights:** Light intensities (currently 0.5–0.9) may appear different under physical light mode. Visual tuning needed but not a code break.

### C. Geometry & Materials (No Impact in App)
*   ~~`THREE.Geometry` removal~~ — App already uses `BufferGeometry` everywhere. **No changes needed in app code.** (Upstream simulator does need this fix — see Section 2.)
*   ~~Vertex colors, UV attributes~~ — Not used in this project. **No changes needed.**

### D. Architecture (Medium Impact)
*   **ES Modules:** `TransformControls` (used in `sandbox.html`) is loaded from CDN at r110 and must be updated. `TrackballControls` is a local custom file — no change needed.
*   **SVGLoader** (`js/lib/SVGLoader.js`) is a local copy — should be replaced with the r182 version.
*   ~~Legacy GLTF loaders~~ — Not used. **No changes needed.**

---

## 4. Phased Implementation Plan

### Phase 1: Patch origami-simulator.js Bundle (~15-20h)
*   [ ] Add a comment at the top of `js/lib/origami-simulator.js` noting the upstream commit it's based on
*   [ ] Migrate all 12 inline shaders to GLSL 300 es:
    - Add `#version 300 es` and `precision mediump float;`
    - `texture2D()` → `texture()`
    - `gl_FragColor` → declare `out vec4 fragColor;` and use it
    - `attribute` → `in`, `varying` → `in`/`out`
*   [ ] Rewrite `saveSTL` and `saveFOLD` functions to use `BufferGeometry` directly (remove `THREE.Geometry`, `THREE.Face3`, `.fromBufferGeometry()`)
*   [ ] Update material constants: `THREE.VertexColors` → `true`
*   [ ] Test simulation end-to-end with all 3 tutorial fold steps
*   [ ] Fork `amandaghassaei/OrigamiSimulator` on GitHub for eventual PR

### Phase 2: App-Side Three.js Upgrade (~3-4h)
*   [ ] Replace CDN link from `three.js/110` → `three.js/r182` in all HTML files (`index.html`, `sandbox.html`, `animation-test.html`)
*   [ ] Add `renderer.outputColorSpace = THREE.SRGBColorSpace` to renderer init in assembly/sandbox/folding views
*   [ ] Update `TransformControls` CDN reference in `sandbox.html` to r182
*   [ ] Replace local `js/lib/SVGLoader.js` with the r182-compatible version
*   [ ] Visual regression check: compare lighting/colors before and after, tune intensities if needed

### Phase 3: Testing (~4-6h)
*   [ ] Folding view: all 3 tutorial steps animate correctly
*   [ ] Assembly view: Sonobe units render, explode/implode animation works
*   [ ] Sandbox view: TransformControls gizmo works, snap system functions
*   [ ] Cinematic mode: point light orbiting, camera animation
*   [ ] Mobile: touch controls still work
*   [ ] GPGPU physics: verify simulation output matches pre-migration behavior (screenshot comparison)

### Phase 4: Cleanup (Optional)
*   [ ] Submit PR to upstream `amandaghassaei/OrigamiSimulator`
*   [ ] Consider converting to npm + Vite build (eliminates CDN dependency)
*   [ ] Remove `js/lib/three.min.js` stub file (404 placeholder, unused)

---

## 5. File Impact Summary

### App Files (this repo)

| File | Change Needed | Risk |
|------|--------------|------|
| `index.html` | Update CDN link, script loading order | Low |
| `sandbox.html` | Update CDN link + TransformControls ref | Low |
| `animation-test.html` | Update CDN link | Low |
| `js/assembly-view-v2.js` | Add `outputColorSpace`, tune lights | Low |
| `js/sandbox-view.js` | Add `outputColorSpace`, tune lights | Low |
| `js/folding-view.js` | Add `outputColorSpace` | Low |
| `js/lib/SVGLoader.js` | Replace with r182 version | Low |
| `js/lib/origami-simulator.js` | Patch directly: shaders, Geometry removal, constants | Medium |
| `js/lib/trackballcontrols-no-scroll.js` | No change (local, compatible) | None |
| `js/lib/three.min.js` | Delete (404 stub, unused) | None |

### Reference: Upstream Source (references/OrigamiSimulator)

Cloned for reference during patching. The equivalent upstream files for the sections of the bundle that need changes:

| Upstream File | Bundle Location (approx) | Change |
|---------------|--------------------------|--------|
| `index.html` (inline shaders) | Lines ~915-1290 | GLSL 300 es migration |
| `js/saveFOLD.js` | Search `saveFOLD` | Remove `THREE.Geometry` |
| `js/saveSTL.js` | Search `saveSTL` | Remove `THREE.Geometry`/`Face3` |
| `js/model.js` | Search `VertexColors` | Constant updates |
| `js/dynamic/GPUMath.js` | Search `GPUMath` | **No changes** (raw WebGL) |
| `js/dynamic/GLBoilerplate.js` | Search `GLBoilerplate` | **No changes** (raw WebGL) |
