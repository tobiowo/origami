# Three.js Migration Plan

## Completed: r110 → r160 (commit 8d3b4b0)

r160 is the last Three.js version that ships the global `three.min.js` build. This upgrade was completed with zero architectural changes to script loading.

### Key Discovery

The origami-simulator's GPGPU shaders run on their own WebGL 1 context (`canvas.getContext("webgl")` in the bundle), completely separate from Three.js's renderer. The ~700 lines of GLSL shaders did NOT need migration. This reduced the scope dramatically from the original ~20h estimate to ~2h.

### Changes Made

| File | Change |
|------|--------|
| `index.html`, `sandbox.html`, `animation-test.html` | CDN link updated to `three@0.160.0` |
| `js/lib/origami-simulator.js` | `VertexColors` → `true`, `addAttribute` → `setAttribute`, removed `geometry.dynamic`, `LineSegments(null)` → `LineSegments(new BufferGeometry())` |
| `js/lib/SVGLoader.js` | `addAttribute` → `setAttribute` |
| `js/sandbox-view.js` | `SphereBufferGeometry` → `SphereGeometry`, added `outputColorSpace` |
| `js/assembly-view-v2.js` | Added `outputColorSpace = THREE.SRGBColorSpace` |
| `js/lib/TransformControls.js` | New file — r160 ESM source wrapped as IIFE for global `THREE` namespace |
| `js/lib/three.min.js` | Deleted (was a 404 stub) |
| `sandbox.html` | TransformControls switched from CDN to local file |

---

## Future: r160 → r182+ (ES Module Migration)

After r160, Three.js only provides ES modules. This requires architectural changes to how scripts are loaded.

### What Needs to Change

1. **Add an import map** to each HTML file:
```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.min.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/"
  }
}
</script>
```

2. **Create a bootstrap module** that loads THREE and exposes it globally for legacy libs:
```html
<script type="module">
  import * as THREE from 'three';
  window.THREE = THREE;
</script>
```

3. **Convert legacy script loading to dynamic imports** — since `<script type="module">` is deferred, legacy libs like `origami-simulator.js` that expect `window.THREE` need to be loaded after the module script runs. Options:
   - Convert all lib loading to a single bootstrap.js that does `await import()` in sequence
   - Or convert origami-simulator.js itself to an ES module (larger effort)

4. **Import Three.js addons as ES modules** — TransformControls, SVGLoader etc. can be imported directly:
```js
import { TransformControls } from 'three/addons/controls/TransformControls.js';
```

### What Does NOT Need Changing (Even for r182+)

- **GPGPU shaders** — Run on their own WebGL 1 context, completely independent of Three.js
- **TrackballControls** — Local custom file with no Three.js version dependency
- **BufferGeometry usage** — Already modern throughout app code
- **folding-view.js** — Uses simulator's internal renderer, no direct Three.js renderer setup
- **app.js** — No Three.js API usage
