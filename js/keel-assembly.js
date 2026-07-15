/**
 * Open-frame polyhedra assembled from Keel units (see plans/keel-unit.md).
 *
 * One unit per polyhedron edge. Each unit renders as a tent-profile strut:
 * a wing in each adjacent face plane (the band of the face within `inset`
 * of the edge, trimmed at the corners by the angle bisectors — the
 * inset-polygon construction) joined at a crest raised slightly along the
 * mean face normal. Faces stay open, so the models read as lattices.
 */

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PHI = (1 + Math.sqrt(5)) / 2;

// ── vector helpers ───────────────────────────────────────────────────
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const scl = (a, s) => a.map((v) => v * s);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a) => Math.sqrt(dot(a, a));
const normalize = (a) => scl(a, 1 / (len(a) || 1));

// ── polyhedra (vertices + faces with consistent in-face vertex order) ─
function icosahedronData(S) {
  const verts = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ].map((p) => scl(p, S));
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  return { verts, faces };
}

// The dodecahedron as the icosahedron's dual: one vertex per icosa face
// (its centroid, normalized), one pentagon per icosa vertex.
function dodecahedronData(S) {
  const { verts: iv, faces: ifc } = icosahedronData(1);
  const verts = ifc.map((f) => {
    const c = scl(add(add(iv[f[0]], iv[f[1]]), iv[f[2]]), 1 / 3);
    return scl(normalize(c), S);
  });
  const faces = iv.map((v, vi) => {
    const ring = ifc.map((f, fi) => fi).filter((fi) => ifc[fi].includes(vi));
    // Order the five faces around the vertex by angle in its tangent plane.
    const n = normalize(v);
    const ref = normalize(sub(verts[ring[0]], scl(n, dot(verts[ring[0]], n))));
    const tang = cross(n, ref);
    return ring.sort((a, b) => {
      const pa = verts[a], pb = verts[b];
      return Math.atan2(dot(pa, tang), dot(pa, ref)) - Math.atan2(dot(pb, tang), dot(pb, ref));
    });
  });
  return { verts, faces };
}

const MODELS = {
  pentagon: () => {
    const verts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 2 * Math.PI + Math.PI / 2;
      verts.push([1.3 * Math.cos(a), 0, 1.3 * Math.sin(a)]);
    }
    return { verts, faces: [[0, 1, 2, 3, 4]] };
  },
  tetrahedron: () => {
    const S = 0.95;
    return {
      verts: [[S, S, S], [S, -S, -S], [-S, S, -S], [-S, -S, S]],
      faces: [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]],
    };
  },
  cube: () => {
    const S = 0.85;
    const verts = [
      [-S, -S, -S], [S, -S, -S], [S, S, -S], [-S, S, -S],
      [-S, -S, S], [S, -S, S], [S, S, S], [-S, S, S],
    ];
    const faces = [
      [0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1],
      [2, 6, 7, 3], [1, 5, 6, 2], [0, 3, 7, 4],
    ];
    return { verts, faces };
  },
  octahedron: () => {
    const S = 1.25;
    return {
      verts: [[S, 0, 0], [-S, 0, 0], [0, S, 0], [0, -S, 0], [0, 0, S], [0, 0, -S]],
      faces: [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]],
    };
  },
  dodecahedron: () => dodecahedronData(1.45),
  icosahedron: () => icosahedronData(0.8),
};

const UNIT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c,
  0xd35400, 0x27ae60, 0x2980b9, 0x8e44ad, 0xc0392b, 0x16a085,
  0xe67e22, 0xe91e63, 0x00bcd4, 0x8bc34a, 0xff9800, 0x673ab7,
  0x009688, 0xf44336, 0x03a9f4, 0xcddc39, 0xff5722, 0x9c27b0,
  0x4caf50, 0x2196f3, 0xffeb3b, 0x795548, 0x607d8b, 0x00e5a0,
];

/**
 * Per-edge strut geometry. Returns [{ wings: [quad, ...] }], one per edge;
 * each quad is 4 points [crestA, crestB, insetB, insetA].
 */
export function buildFrameUnits(model, inset = 0.18, lift = 0.05) {
  const { verts, faces } = model;

  // Face normals (Newell) oriented away from the model center.
  const normals = faces.map((f) => {
    const n = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = verts[f[i]], b = verts[f[(i + 1) % f.length]];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const cent = scl(f.reduce((acc, vi) => add(acc, verts[vi]), [0, 0, 0]), 1 / f.length);
    const nn = normalize(n);
    return dot(nn, cent) >= 0 ? nn : scl(nn, -1);
  });

  // Inset polygon corner per (face, vertex): offset both edges at the
  // corner inward by `inset`; the corner moves along the bisector.
  const insetCorner = (f, k) => {
    const A = verts[f[k]];
    const P = verts[f[(k - 1 + f.length) % f.length]];
    const N = verts[f[(k + 1) % f.length]];
    const e1 = normalize(sub(N, A));
    const e2 = normalize(sub(P, A));
    const bis = normalize(add(e1, e2));
    const sinHalf = Math.sqrt((1 - dot(e1, e2)) / 2) || 1;
    return add(A, scl(bis, inset / sinHalf));
  };

  // Collect edges with their adjacent (face, local index) pairs.
  const edgeMap = new Map();
  faces.forEach((f, fi) => {
    for (let k = 0; k < f.length; k++) {
      const a = f[k], b = f[(k + 1) % f.length];
      const key = Math.min(a, b) + ',' + Math.max(a, b);
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key).push({ fi, k });
    }
  });

  return [...edgeMap.entries()].map(([key, adj]) => {
    const [ai, bi] = key.split(',').map(Number);
    const A = verts[ai], B = verts[bi];
    const crestDir = adj.length === 2
      ? normalize(add(normals[adj[0].fi], normals[adj[1].fi]))
      : normals[adj[0].fi];
    const Ac = add(A, scl(crestDir, lift));
    const Bc = add(B, scl(crestDir, lift));

    const wings = adj.map(({ fi, k }) => {
      const f = faces[fi];
      const kA = f.indexOf(ai);
      const kB = f.indexOf(bi);
      return [Ac, Bc, insetCorner(f, kB), insetCorner(f, kA)];
    });
    return { wings };
  });
}

export class KeelAssemblyView {
  constructor() {
    this.container = null;
    this.autoRotate = false;
    this.ready = false;
  }

  init(containerEl) {
    this.container = containerEl;
    const rect = containerEl.getBoundingClientRect();
    const w = rect.width || 640;
    const h = rect.height || 480;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(2.4, 3.2, 3.4);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    containerEl.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 20;

    this.scene.add(new THREE.AmbientLight(0x404060, 0.9 * Math.PI));
    const key = new THREE.DirectionalLight(0xffffff, 0.7 * Math.PI);
    key.position.set(5, 10, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x4488cc, 0.3 * Math.PI);
    fill.position.set(-5, -2, -5);
    this.scene.add(fill);

    this.frameGroup = new THREE.Group();
    this.scene.add(this.frameGroup);

    this.edgeMat = new THREE.LineBasicMaterial({ color: 0x10131c });

    this.ready = true;
    this._animate();
  }

  setCinematicMode(enabled) {
    this.autoRotate = enabled;
    if (!enabled) this.frameGroup.rotation.set(0, 0, 0);
  }

  clear() {
    for (const child of [...this.frameGroup.children]) {
      this.frameGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material && child.material !== this.edgeMat) child.material.dispose();
    }
  }

  /** Render an open-frame model; modelId is a key of MODELS. */
  renderModel(modelId) {
    this.clear();
    const make = MODELS[modelId];
    if (!make) return;
    const units = buildFrameUnits(make());

    units.forEach((unit, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: UNIT_COLORS[i % UNIT_COLORS.length],
        roughness: 0.7,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      for (const quad of unit.wings) {
        const verts = [];
        for (const tri of [[0, 1, 2], [0, 2, 3]]) {
          for (const idx of tri) verts.push(...quad[idx]);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
        geo.computeVertexNormals();
        this.frameGroup.add(new THREE.Mesh(geo, mat));

        const outline = new THREE.BufferGeometry().setFromPoints(
          [...quad, quad[0]].map((p) => new THREE.Vector3(...p)),
        );
        this.frameGroup.add(new THREE.Line(outline, this.edgeMat));
      }
    });
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (!this.ready) return;
    if (this.autoRotate) this.frameGroup.rotation.y += 0.004;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  show() {
    if (this.container) this.container.style.display = 'block';
    if (this.renderer && this.container) {
      const rect = this.container.getBoundingClientRect();
      if (rect.width && rect.height) {
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(rect.width, rect.height);
      }
    }
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }
}
