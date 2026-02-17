# Three.js Migration — Complete

Both migration phases are done. The app now runs on Three.js r182 via ES modules.

---

## Phase 1: r110 → r160 (commit 8d3b4b0)

r160 is the last version with the global `three.min.js` build. Upgraded with zero architectural changes.

**Key discovery:** The origami-simulator's GPGPU shaders run on their own WebGL 1 context, completely separate from Three.js. No shader migration needed.

| File | Change |
|------|--------|
| `js/lib/origami-simulator.js` | `VertexColors` → `true`, `addAttribute` → `setAttribute`, removed `geometry.dynamic`, `LineSegments(null)` → `LineSegments(new BufferGeometry())` |
| `js/lib/SVGLoader.js` | `addAttribute` → `setAttribute` |
| `js/sandbox-view.js` | `SphereBufferGeometry` → `SphereGeometry`, added `outputColorSpace` |
| `js/assembly-view-v2.js` | Added `outputColorSpace = THREE.SRGBColorSpace` |

---

## Phase 2: r160 → r182 ES Module Migration

Switched from the global `three.min.js` build to ES module imports via import maps.

### Architecture

```
HTML
 └─ <script type="importmap"> — maps "three" → jsdelivr r182
 └─ <script type="module" src="js/main.js"> — page entry point

main.js (page-specific)
 ├─ import { loadScript } from './bootstrap.js'
 │    └─ imports THREE as ES module
 │    └─ window.THREE = Object.assign({}, THREE)  (mutable copy)
 │    └─ exports loadScript() helper
 ├─ await loadScript('js/lib/trackballcontrols.js')
 ├─ await loadScript('js/lib/SVGLoader.js')  etc.
 └─ await import('./app.js')  — dynamic import after globals ready
```

### Key lessons

- **ES module namespace is frozen** — `import * as THREE` gives a read-only object. Legacy scripts that mutate `THREE` (e.g. `THREE.SVGLoader = ...`) need a mutable copy: `Object.assign({}, THREE)`.
- **`DOMContentLoaded` fires before dynamic imports** — App entry points (app.js, sandbox.js) that used `document.addEventListener('DOMContentLoaded', init)` needed a readyState check since they're loaded after DOM is ready.
- **TransformControls no longer extends Object3D in r182** — It extends `Controls` (EventDispatcher). Use `scene.add(controls.getHelper())` instead of `scene.add(controls)`.

### Files created

| File | Purpose |
|------|---------|
| `js/bootstrap.js` | Imports THREE as ES module, exposes as mutable global, exports `loadScript()` |
| `js/main.js` | Entry point for index.html — loads legacy libs, then app.js |
| `js/sandbox-main.js` | Entry point for sandbox.html — imports TransformControls from CDN addon |
| `js/animation-test-main.js` | Entry point for animation-test.html — moved inline code from HTML |

### Files modified

| File | Change |
|------|--------|
| `index.html` | Import map + single module entry, removed 7 script tags |
| `sandbox.html` | Import map + single module entry, removed 4 script tags |
| `animation-test.html` | Import map + single module entry, removed script tags + inline module |
| `js/app.js` | DOMContentLoaded → readyState check for dynamic import compatibility |
| `js/sandbox.js` | Same readyState fix |
| `js/sandbox-view.js` | `scene.add(transformControls)` → `scene.add(transformControls.getHelper())` |

### Files deleted

| File | Reason |
|------|--------|
| `js/lib/TransformControls.js` | Replaced by CDN import via import map in sandbox-main.js |
