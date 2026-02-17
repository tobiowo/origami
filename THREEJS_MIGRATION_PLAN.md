# Three.js Migration Plan: r110 → r182

This document outlines the strategic plan to upgrade the Three.js dependency from version r110 to the latest stable version (r182).

---

## 1. Executive Summary
Upgrading from r110 (2020) to r182 (current) is a major leap that involves moving from WebGL 1 to WebGL 2, adopting modern color management, and shifting to a module-based architecture. While significant, it unlocks WebGPU support, improved performance, and better compatibility with modern tools like Vite.

---

## 2. Breaking Changes & Technical Debt

### A. Rendering Engine (High Priority)
*   **Mandatory WebGL 2:** `WebGLRenderer` now requires WebGL 2.
*   **Shader Migration:** Custom GPGPU shaders in `origami-simulator.js` must be updated from GLSL ES 1.0 (`texture2D`, `varying`) to 3.0 (`texture()`, `in`/`out`).
*   **Stencil Buffer:** Stencil is now `false` by default.

### B. Color & Lighting
*   **Color Management:** `outputEncoding` is replaced by `outputColorSpace`. `ColorManagement.enabled` is `true` by default.
*   **Physical Lights:** `useLegacyLights` is `false` by default. Light intensities must be re-calibrated for physical units.

### C. Geometry & Materials
*   **Geometry Removal:** `THREE.Geometry` is gone. Everything must use `THREE.BufferGeometry`.
*   **Vertex Colors:** `material.vertexColors` is now a boolean.
*   **Attributes:** UV attribute naming has changed (`uv2` → `uv1`, etc.).

### D. Architecture
*   **ES Modules (JSM):** Examples/Helpers (Controls, Loaders) are no longer in the `THREE` namespace and must be imported as JSM modules.
*   **Legacy Loaders:** Removal of `LegacyGLTFLoader` and others.

---

## 3. Phased Implementation Plan

To allow multiple agents to work in parallel, the migration is broken into the following tracks:

### Phase 1: Infrastructure & Environment (Agent A)
*   [ ] Initialize a modern build system (Vite) for the main project, similar to `fold-validator`.
*   [ ] Convert `js/lib/` dependencies to npm packages or local ES modules.
*   [ ] Update `index.html` to use `<script type="module">`.

### Phase 2: Shader & Simulation Migration (Agent B)
*   [ ] Audit `origami-simulator.js` for WebGL 1 specific calls.
*   [ ] Rewrite simulation shaders to GLSL 3.0 (WebGL 2 compatible).
*   [ ] Test GPGPU data read-back using the new `readPixels` requirements.

### Phase 3: Core Rendering & Visuals (Agent C)
*   [ ] Update `WebGLRenderer` initialization with new color space settings.
*   [ ] Recalibrate all `DirectionalLight` and `AmbientLight` intensities.
*   [ ] Convert any remaining `THREE.Geometry` usage to `THREE.BufferGeometry`.
*   [ ] Update `Material` properties (vertex colors, etc.).

### Phase 4: Integration & Testing (Agent D)
*   [ ] Fix `TrackballControls` and `SVGLoader` imports.
*   [ ] Validate the Sonobe assembly animation sequence.
*   [ ] Perform regression testing on cinematic effects.

---

## 4. Potential Benefits
*   **WebGPU Readiness:** Future-proofed for TSL (Three Shading Language).
*   **Performance:** Faster geometry processing and better memory management.
*   **Maintainability:** Aligns the core project with modern JavaScript standards.
