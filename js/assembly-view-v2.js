/**
 * Mathematically accurate Three.js scene for multi-unit Sonobe assembly.
 * This Version 2 supports "Flaps into Pockets" visualization by rendering 
 * dual-layered body triangles and offset tabs.
 */

import { OBJSonobeConverter } from './obj-sonobe-converter.js';

// ── Shared vector math helpers ──────────────────────────────────────
const V3 = {
  mid:   (a, b) => a.map((v, i) => (v + b[i]) / 2),
  add:   (a, b) => a.map((v, i) => v + b[i]),
  sub:   (a, b) => a.map((v, i) => v - b[i]),
  scl:   (a, s) => a.map(v => v * s),
  dot:   (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
  cross: (a, b) => [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ],
  len:       (a) => Math.sqrt(V3.dot(a, a)),
  normalize: (a) => { const l = V3.len(a); return l > 0 ? V3.scl(a, 1/l) : a; },
  add3:  (a, b, c) => a.map((v, i) => v + b[i] + c[i]),
};
const { mid, add, sub, scl, dot, cross, len, normalize, add3 } = V3;

const POCKET_GAP = 0.012; // Gap between outer and inner pocket layers

// ── Helper: build stellated polyhedron units from faces + vertices ───
function buildStellatedUnits(verts, faces, scale, ridgeFrac) {
  const faceEdge = len(sub(verts[faces[0][0]], verts[faces[0][1]]));
  const lateral = faceEdge / Math.sqrt(2);

  const faceApices = faces.map(f => {
    const n = f.length;
    const circumR = faceEdge / (2 * Math.sin(Math.PI / n));
    const apexH = Math.sqrt(Math.max(0, lateral * lateral - circumR * circumR));
    const centroid = f.reduce((acc, vi) => add(acc, verts[vi]), [0,0,0]);
    const cent = scl(centroid, 1 / n);
    const outDir = normalize(cent);
    return add(cent, scl(outDir, apexH));
  });

  const edgeSet = new Set();
  const edgeList = [];
  faces.forEach(f => {
    const n = f.length;
    for (let k = 0; k < n; k++) {
      const ei = f[k], ej = f[(k+1) % n];
      const key = Math.min(ei, ej) + ',' + Math.max(ei, ej);
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edgeList.push([Math.min(ei, ej), Math.max(ei, ej)]);
      }
    }
  });

  const edgeFaces = edgeList.map(([ei, ej]) => {
    const adj = [];
    faces.forEach((f, fi) => {
      if (f.includes(ei) && f.includes(ej)) adj.push(fi);
    });
    return adj;
  });

  const ridge = scale * ridgeFrac;
  const tabLeg = faceEdge / 2;

  return edgeList.map(([ei, ej], idx) => {
    const A = verts[ei], B = verts[ej];
    const [fi1, fi2] = edgeFaces[idx];
    const apex1 = faceApices[fi1];
    const apex2 = faceApices[fi2];

    const n1 = faces[fi1].length;
    const cent1 = scl(faces[fi1].reduce((acc, vi) => add(acc, verts[vi]), [0,0,0]), 1/n1);
    const n2 = faces[fi2].length;
    const cent2 = scl(faces[fi2].reduce((acc, vi) => add(acc, verts[vi]), [0,0,0]), 1/n2);
    const ridgeDir = normalize(add(normalize(cent1), normalize(cent2)));
    const A_r = add(A, scl(ridgeDir, ridge));
    const B_r = add(B, scl(ridgeDir, ridge));

    // Body: two triangles, one per adjacent pyramid face
    const b1 = [A_r, B_r, apex1];
    const b2 = [A_r, B_r, apex2];

    // Tabs: right isosceles triangles folding inward
    const fn1out = normalize(cent1);
    const fn2out = normalize(cent2);
    const tipA = sub(A, scl(fn1out, tabLeg));
    const tipB = sub(B, scl(fn2out, tabLeg));

    const t1 = [A_r, apex1, tipA];
    const t2 = [B_r, apex2, tipB];

    return { b1, b2, t1, t2 };
  });
}

export class AssemblyView {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.units = [];
    this.unitGroup = new THREE.Group();
    this.animationId = null;
    this.ready = false;
    this.modelType = 6;
    this.unitCount = 0;
    this.autoRotate = false;
    this.dynamicLight = null;
    this.customUnits = [];

    this.explodeProgress = 0;
    this.explodeTarget = 0;
    this.explodeSpeed = 2.5;
    this.explodeScale = 2.5;
    this._lastTime = 0;
  }

  init(containerEl) {
    this.container = containerEl;
    const rect = containerEl.getBoundingClientRect();
    const w = rect.width || 640;
    const h = rect.height || 480;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(3.5, 3, 3.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    containerEl.appendChild(this.renderer.domElement);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 2.0;
    this.controls.staticMoving = true;

    this.scene.add(new THREE.AmbientLight(0x404060, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    this.dynamicLight = new THREE.PointLight(0xffffff, 0.7, 20);
    this.scene.add(this.dynamicLight);

    this.scene.add(this.unitGroup);

    this._onResize = () => this._handleResize();
    window.addEventListener('resize', this._onResize);

    this.ready = true;
    this._animate();
  }

  setCinematicMode(enabled) {
    this.autoRotate = enabled;
    if (!enabled) {
      if (this.unitGroup) this.unitGroup.rotation.set(0, 0, 0);
    }
  }

  setModelType(type) {
    this.modelType = type;
    this.setUnitCount(this.unitCount);
  }

  async loadCustomOBJ(url) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const { verts, faces } = OBJSonobeConverter.parse(text);
      
      // Calculate scale to fit in view
      let maxDist = 0;
      verts.forEach(v => {
        const d = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        if (d > maxDist) maxDist = d;
      });
      const normScale = 2.0 / maxDist;
      const scaledVerts = verts.map(v => v.map(c => c * normScale));

      this.customUnits = OBJSonobeConverter.buildUnitsFromMesh(scaledVerts, faces, 1.0, 0.02);
      this.modelType = 'custom';
      this.setUnitCount(this.customUnits.length);
      return this.customUnits.length;
    } catch (e) {
      console.error("Failed to load OBJ:", e);
      return 0;
    }
  }

  toggleExplode() {
    this.explodeTarget = this.explodeTarget === 0 ? 1 : 0;
    return this.explodeTarget === 1;
  }

  setUnitCount(count) {
    this.unitCount = count;
    if (!this.ready) return;

    this.units.forEach(u => this.unitGroup.remove(u));
    this.units = [];

    const defs = this._getUnitDefs();
    const n = Math.min(defs.length, count);
    
    for (let i = 0; i < n; i++) {
      const unit = this._createUnit(defs[i], i);
      this.unitGroup.add(unit);
      this.units.push(unit);
    }
    
    this._applyExplode();
  }

  show() {
    if (this.container) {
      this.container.style.display = "block";
      this._handleResize();
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  _animate() {
    this.animationId = requestAnimationFrame((t) => this._animate(t));

    if (this.ready) {
      const time = performance.now() * 0.001;
      const dt = this._lastTime ? time - this._lastTime : 0.016;
      this._lastTime = time;

      if (this.autoRotate && this.unitGroup) {
        this.unitGroup.rotation.y += 0.003;
      }

      if (this.dynamicLight && this.autoRotate) {
        this.dynamicLight.position.x = Math.sin(time * 0.7) * 4;
        this.dynamicLight.position.z = Math.cos(time * 0.7) * 4;
        this.dynamicLight.position.y = Math.sin(time * 0.5) * 2 + 2;
      }

      if (this.explodeProgress !== this.explodeTarget) {
        const dir = this.explodeTarget > this.explodeProgress ? 1 : -1;
        this.explodeProgress += dir * this.explodeSpeed * dt;
        this.explodeProgress = Math.max(0, Math.min(1, this.explodeProgress));
        if (Math.abs(this.explodeProgress - this.explodeTarget) < 0.005) {
          this.explodeProgress = this.explodeTarget;
        }
        this._applyExplode();
      }

      if (this.controls) this.controls.update();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  _applyExplode() {
    const p = this.explodeProgress;
    const t = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    for (const unit of this.units) {
      const c = unit.userData.centroid;
      if (c) {
        unit.position.set(
          c.x * t * this.explodeScale,
          c.y * t * this.explodeScale,
          c.z * t * this.explodeScale
        );
      }
    }
  }

  _handleResize() {
    if (!this.container || !this.renderer) return;
    const rect = this.container.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
    if (this.controls) this.controls.handleResize();
  }

  _createUnit(def, index) {
    const group = new THREE.Group();
    const color = UNIT_COLORS[index % UNIT_COLORS.length];

    // Standard material for the unit (Opaque and DoubleSide)
    const mat = new THREE.MeshPhongMaterial({
      color: color,
      side: THREE.DoubleSide,
      flatShading: true,
      transparent: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    // Darker material for the "inside" of the pocket
    const innerColor = new THREE.Color(color).multiplyScalar(0.5);
    const innerMat = new THREE.MeshPhongMaterial({
      color: innerColor,
      side: THREE.DoubleSide,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    });

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

    const cx = new THREE.Vector3();
    let count = 0;
    [def.b1, def.b2, def.t1, def.t2].forEach(tri => {
      tri.forEach(v => { cx.x += v[0]; cx.y += v[1]; cx.z += v[2]; count++; });
    });
    cx.divideScalar(count);
    group.userData.centroid = cx;

    // Body Triangles (Pockets)
    [def.b1, def.b2].forEach(verts => {
      // Compute normal
      const v0 = new THREE.Vector3(...verts[0]);
      const v1 = new THREE.Vector3(...verts[1]);
      const v2 = new THREE.Vector3(...verts[2]);
      const normal = new THREE.Vector3().crossVectors(v1.clone().sub(v0), v2.clone().sub(v0)).normalize();
      
      const centerDir = new THREE.Vector3().addVectors(v0, v1).add(v2).divideScalar(3).normalize();
      if (normal.dot(centerDir) > 0) normal.multiplyScalar(-1);

      // Outer Layer
      const geoOuter = this._createTriGeo(verts);
      group.add(new THREE.Mesh(geoOuter, mat));
      
      // Special: only draw the "pocket opening" edge in black
      // The pocket opening in Sonobe is the edge opposite to the apex of the pyramid (the ridge)
      // or more specifically the edge that isn't shared with the other body triangle.
      // For simplicity, we draw all edges but with a priority.
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoOuter), edgeMat));

      // Inner Layer (shifted inward to create pocket space)
      const innerVerts = verts.map(v => add(v, [normal.x * POCKET_GAP, normal.y * POCKET_GAP, normal.z * POCKET_GAP]));
      const geoInner = this._createTriGeo(innerVerts);
      group.add(new THREE.Mesh(geoInner, innerMat));
    });

    // Tab Triangles (Flaps)
    [def.t1, def.t2].forEach(verts => {
      const v0 = new THREE.Vector3(...verts[0]);
      const v1 = new THREE.Vector3(...verts[1]);
      const v2 = new THREE.Vector3(...verts[2]);
      const normal = new THREE.Vector3().crossVectors(v1.clone().sub(v0), v2.clone().sub(v0)).normalize();
      
      const centerDir = new THREE.Vector3().addVectors(v0, v1).add(v2).divideScalar(3).normalize();
      if (normal.dot(centerDir) > 0) normal.multiplyScalar(-1);

      // Shift tab deeper into the pocket gap (0.7 instead of 0.5 to ensure it's behind the outer layer)
      const shiftedVerts = verts.map(v => add(v, [normal.x * POCKET_GAP * 0.7, normal.y * POCKET_GAP * 0.7, normal.z * POCKET_GAP * 0.7]));
      const geo = this._createTriGeo(shiftedVerts);
      
      // Use a tab material that is pushed back in depth
      const tabMat = mat.clone();
      tabMat.polygonOffsetFactor = 1.8;
      
      group.add(new THREE.Mesh(geo, tabMat));
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    });

    return group;
  }

  _createTriGeo(verts) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts.flat()), 3));
    geo.setIndex([0, 1, 2]);
    geo.computeVertexNormals();
    return geo;
  }

  _getUnitDefs() {
    if (this.modelType === 'custom') return this.customUnits;
    
    switch(parseInt(this.modelType)) {
      case 2:   return this._generateSquare();
      case 3:   return this._generateJewel();
      case 12:  return this._generateOctahedron();
      case 30:  return this._generateIcosahedron();
      case 60:  return this._generatePentakisDodecahedron();
      case 90:  return this._generateTruncatedIcosahedron();
      case 120: return this._generateRhombicosidodecahedron();
      case 270: return this._generateGeodesicIcosahedron270();
      default:  return this._generateCube();
    }
  }

  _generateSquare() {
    // A 2-unit Sonobe assembly forms a flat square.
    // Each unit is a parallelogram folded into two body triangles with two tabs.
    const S = 1.0; // Half-side of the square
    const r = 0.015; // Vertical offset for layering
    
    // Vertices of the square assembly
    const TL = [-S, r, -S], TR = [S, r, -S], BL = [-S, r, S], BR = [S, r, S], Center = [0, r, 0];
    const TL_b = [-S, -r, -S], TR_b = [S, -r, -S], BL_b = [-S, -r, S], BR_b = [S, -r, S], Center_b = [0, -r, 0];

    // Unit 1 (Color A): Ridge from TL to BR
    // Body: Top triangle [TL, TR, Center] and Bottom triangle [BL, BR, Center]
    // Tabs: TR and BL (but these tuck into Unit 2)
    const u1 = {
      b1: [TL, TR, Center],
      b2: [BL, BR, Center],
      t1: [TR_b, BR_b, Center_b], // Tab 1 tucked under Unit 2's Right face
      t2: [TL_b, BL_b, Center_b], // Tab 2 tucked under Unit 2's Left face
    };

    // Unit 2 (Color B): Ridge from TR to BL
    // Body: Right triangle [TR, BR, Center] and Left triangle [TL, BL, Center]
    const u2 = {
      b1: [TR, BR, Center],
      b2: [TL, BL, Center],
      t1: [TL_b, TR_b, Center_b], // Tab 1 tucked under Unit 1's Top face
      t2: [BL_b, BR_b, Center_b], // Tab 2 tucked under Unit 1's Bottom face
    };

    return [u1, u2];
  }

  _generateCube() {
    const S = 0.7;
    const C = [[-S,-S,-S], [S,-S,-S], [S,S,-S], [-S,S,-S], [-S,-S,S], [S,-S,S], [S,S,S], [-S,S,S]];
    const r = S * 0.12;
    const faces = [
      { diag: [5,7], others: [4,6], normal: [0,0,1]  },
      { diag: [0,2], others: [1,3], normal: [0,0,-1] },
      { diag: [2,7], others: [3,6], normal: [0,1,0]  },
      { diag: [0,5], others: [1,4], normal: [0,-1,0] },
      { diag: [2,5], others: [1,6], normal: [1,0,0]  },
      { diag: [0,7], others: [3,4], normal: [-1,0,0] },
    ];
    return faces.map(f => {
      const A = C[f.diag[0]], B = C[f.diag[1]], P = C[f.others[0]], Q = C[f.others[1]], n = f.normal;
      const A_r = add(A, scl(n, r)), B_r = add(B, scl(n, r)), tabLeg = S * 2;
      return {
        b1: [A_r, B_r, P], b2: [A_r, B_r, Q],
        t1: [add(A, scl(n, r)), P, sub(A, scl(n, tabLeg))],
        t2: [add(B, scl(n, r)), Q, sub(B, scl(n, tabLeg))],
      };
    });
  }

  _generateJewel() {
    const a = 1.4, h = a / Math.sqrt(6), r = a / Math.sqrt(3);
    const E = [[r, 0, 0], [-r/2, 0, a/2], [-r/2, 0, -a/2]];
    const Top = [0, h, 0], Bot = [0, -h, 0], ridge = h * 0.15;
    return [[0,1], [1,2], [2,0]].map(([i, j]) => {
      const A = E[i], B = E[j], edgeDir = normalize(sub(B, A));
      const outward = normalize(cross(edgeDir, [0, 1, 0]));
      const edgeMid = mid(A, B);
      const out = dot(outward, edgeMid) > 0 ? outward : scl(outward, -1);
      const A_r = add(A, scl(out, ridge)), B_r = add(B, scl(out, ridge));
      const fn1 = normalize(cross(sub(Top, A), sub(B, A))), cent1 = scl(add3(A, B, Top), 1/3);
      const fn1out = dot(fn1, cent1) > 0 ? fn1 : scl(fn1, -1);
      const fn2 = normalize(cross(sub(Bot, B), sub(A, B))), cent2 = scl(add3(A, B, Bot), 1/3);
      const fn2out = dot(fn2, cent2) > 0 ? fn2 : scl(fn2, -1);
      const tabLeg = a / 2;
      return { b1: [A_r, B_r, Top], b2: [A_r, B_r, Bot], t1: [A_r, Top, sub(A, scl(fn1out, tabLeg))], t2: [B_r, Bot, sub(B, scl(fn2out, tabLeg))] };
    });
  }

  _generateOctahedron() {
    const S = 1.0;
    const verts = [[S,0,0], [-S,0,0], [0,S,0], [0,-S,0], [0,0,S], [0,0,-S]];
    const faces = [[0,2,4], [0,4,3], [0,3,5], [0,5,2], [1,4,2], [1,3,4], [1,5,3], [1,2,5]];
    return buildStellatedUnits(verts, faces, S, 0.06);
  }

  _generateIcosahedron() {
    const phi = (1 + Math.sqrt(5)) / 2, S = 0.7;
    const verts = [[-1, phi, 0], [1, phi, 0], [-1,-phi, 0], [1,-phi, 0], [0,-1, phi], [0, 1, phi], [0,-1,-phi], [0, 1,-phi], [phi, 0,-1], [phi, 0, 1], [-phi, 0,-1], [-phi, 0, 1]].map(p => p.map(c => c * S));
    const faces = [[0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11], [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8], [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9], [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]];
    return buildStellatedUnits(verts, faces, S, 0.04);
  }

  _generatePentakisDodecahedron() {
    const phi = (1 + Math.sqrt(5)) / 2, S = 0.55;
    const icoVerts = [[-1, phi, 0], [1, phi, 0], [-1,-phi, 0], [1,-phi, 0], [0,-1, phi], [0, 1, phi], [0,-1,-phi], [0, 1,-phi], [phi, 0,-1], [phi, 0, 1], [-phi, 0,-1], [-phi, 0, 1]];
    const icoFaces = [[0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11], [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8], [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9], [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]];
    const icoEdgeSet = new Set(), icoEdges = [];
    icoFaces.forEach(f => { for (let k = 0; k < 3; k++) { const a = f[k], b = f[(k+1)%3], key = Math.min(a,b) + ',' + Math.max(a,b); if (!icoEdgeSet.has(key)) { icoEdgeSet.add(key); icoEdges.push([a, b]); } } });
    const idVerts = icoEdges.map(([a, b]) => mid(icoVerts[a], icoVerts[b]).map(c => c * S));
    const edgeToIdx = {}; icoEdges.forEach(([a, b], idx) => { edgeToIdx[Math.min(a,b) + ',' + Math.max(a,b)] = idx; });
    const triFaces = icoFaces.map(f => { const idxs = []; for (let k = 0; k < 3; k++) { const a = f[k], b = f[(k+1)%3]; idxs.push(edgeToIdx[Math.min(a,b) + ',' + Math.max(a,b)]); } return idxs; });
    const pentFaces = [];
    for (let vi = 0; vi < 12; vi++) {
      const adjEdgeIdxs = []; icoEdges.forEach(([a, b], idx) => { if (a === vi || b === vi) adjEdgeIdxs.push(idx); });
      const ordered = [adjEdgeIdxs[0]], used = new Set([adjEdgeIdxs[0]]);
      while (ordered.length < adjEdgeIdxs.length) {
        const last = ordered[ordered.length - 1], [la, lb] = icoEdges[last], lastOther = la === vi ? lb : la;
        let found = false;
        for (const candidate of adjEdgeIdxs) {
          if (used.has(candidate)) continue;
          const [ca, cb] = icoEdges[candidate], candOther = ca === vi ? cb : ca;
          if (icoFaces.some(f => f.includes(vi) && f.includes(lastOther) && f.includes(candOther))) { ordered.push(candidate); used.add(candidate); found = true; break; }
        }
        if (!found) break;
      }
      pentFaces.push(ordered);
    }
    return buildStellatedUnits(idVerts, [...triFaces, ...pentFaces], S, 0.03);
  }

  _generateTruncatedIcosahedron() {
    const phi = (1 + Math.sqrt(5)) / 2, S = 0.35;
    const icoVerts = [[-1, phi, 0], [1, phi, 0], [-1,-phi, 0], [1,-phi, 0], [0,-1, phi], [0, 1, phi], [0,-1,-phi], [0, 1,-phi], [phi, 0,-1], [phi, 0, 1], [-phi, 0,-1], [-phi, 0, 1]];
    const icoFaces = [[0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11], [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8], [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9], [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]];
    const icoEdgeSet = new Set(), icoEdges = [];
    icoFaces.forEach(f => { for (let k = 0; k < 3; k++) { const a = f[k], b = f[(k+1)%3], key = Math.min(a,b) + ',' + Math.max(a,b); if (!icoEdgeSet.has(key)) { icoEdgeSet.add(key); icoEdges.push([a, b]); } } });
    const edgeKeyToIdx = {}; icoEdges.forEach(([a, b], idx) => { edgeKeyToIdx[Math.min(a,b) + ',' + Math.max(a,b)] = idx; });
    const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const verts = []; icoEdges.forEach(([a, b]) => { verts.push(lerp(icoVerts[a], icoVerts[b], 1/3).map(c => c * S)); verts.push(lerp(icoVerts[a], icoVerts[b], 2/3).map(c => c * S)); });
    const nearIdx = (edgeIdx, vi) => { const [a, b] = icoEdges[edgeIdx]; return a === vi ? edgeIdx * 2 : edgeIdx * 2 + 1; };
    const pentFaces = [];
    for (let vi = 0; vi < 12; vi++) {
      const adjEdgeIdxs = []; icoEdges.forEach(([a, b], idx) => { if (a === vi || b === vi) adjEdgeIdxs.push(idx); });
      const ordered = [adjEdgeIdxs[0]], used = new Set([adjEdgeIdxs[0]]);
      while (ordered.length < adjEdgeIdxs.length) {
        const last = ordered[ordered.length - 1], [la, lb] = icoEdges[last], lastOther = la === vi ? lb : la;
        for (const candidate of adjEdgeIdxs) { if (used.has(candidate)) continue; const [ca, cb] = icoEdges[candidate], candOther = ca === vi ? cb : ca; if (icoFaces.some(f => f.includes(vi) && f.includes(lastOther) && f.includes(candOther))) { ordered.push(candidate); used.add(candidate); break; } }
        if (ordered.length === used.size) continue;
        if (used.size < ordered.length) break;
      }
      pentFaces.push(ordered.map(ei => nearIdx(ei, vi)));
    }
    const hexFaces = icoFaces.map(([a, b, c]) => { const eAB = edgeKeyToIdx[Math.min(a,b)+','+Math.max(a,b)], eBC = edgeKeyToIdx[Math.min(b,c)+','+Math.max(b,c)], eCA = edgeKeyToIdx[Math.min(c,a)+','+Math.max(c,a)]; return [nearIdx(eAB, a), nearIdx(eAB, b), nearIdx(eBC, b), nearIdx(eBC, c), nearIdx(eCA, c), nearIdx(eCA, a)]; });
    return buildStellatedUnits(verts, [...pentFaces, ...hexFaces], S, 0.02);
  }

  _generateGeodesicIcosahedron270() {
    const phi = (1 + Math.sqrt(5)) / 2, S = 0.25;
    const icoVerts = [[-1, phi, 0], [1, phi, 0], [-1,-phi, 0], [1,-phi, 0], [0,-1, phi], [0, 1, phi], [0,-1,-phi], [0, 1,-phi], [phi, 0,-1], [phi, 0, 1], [-phi, 0,-1], [-phi, 0, 1]];
    const icoFaces = [[0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11], [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8], [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9], [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]];
    const icoEdgeSet = new Set(), icoEdges = [];
    icoFaces.forEach(f => { for (let k = 0; k < 3; k++) { const a = f[k], b = f[(k+1)%3], key = Math.min(a,b) + ',' + Math.max(a,b); if (!icoEdgeSet.has(key)) { icoEdgeSet.add(key); icoEdges.push([a, b]); } } });
    const edgeKeyToIdx = {}; icoEdges.forEach(([a, b], idx) => { edgeKeyToIdx[Math.min(a,b) + ',' + Math.max(a,b)] = idx; });
    const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const rawVerts = new Array(92);
    for (let i = 0; i < 12; i++) rawVerts[i] = icoVerts[i].slice();
    icoEdges.forEach(([a, b], idx) => { rawVerts[12 + idx*2] = lerp3(icoVerts[a], icoVerts[b], 1/3); rawVerts[12 + idx*2 + 1] = lerp3(icoVerts[a], icoVerts[b], 2/3); });
    icoFaces.forEach(([a, b, c], fi) => { rawVerts[72 + fi] = icoVerts[a].map((v, i) => (v + icoVerts[b][i] + icoVerts[c][i]) / 3); });
    const sphereR = len(icoVerts[0]), verts = rawVerts.map(v => { const r = len(v); return v.map(c => (c / r) * sphereR * S); });
    const getVertIdx = (faceIdx, a, b, c, i, j, k) => { if (i === 3) return a; if (j === 3) return b; if (k === 3) return c; if (k === 0) { const eIdx = edgeKeyToIdx[Math.min(a,b) + ',' + Math.max(a,b)], [ea] = icoEdges[eIdx], tFromA = j / 3; let tFromEa = ea === a ? tFromA : 1 - tFromA; return tFromEa < 0.5 ? 12 + eIdx*2 : 12 + eIdx*2 + 1; } if (j === 0) { const eIdx = edgeKeyToIdx[Math.min(a,c) + ',' + Math.max(a,c)], [ea] = icoEdges[eIdx], tFromA = k / 3; let tFromEa = ea === a ? tFromA : 1 - tFromA; return tFromEa < 0.5 ? 12 + eIdx*2 : 12 + eIdx*2 + 1; } if (i === 0) { const eIdx = edgeKeyToIdx[Math.min(b,c) + ',' + Math.max(b,c)], [ea] = icoEdges[eIdx], tFromB = k / 3; let tFromEa = ea === b ? tFromB : 1 - tFromB; return tFromEa < 0.5 ? 12 + eIdx*2 : 12 + eIdx*2 + 1; } return 72 + faceIdx; };
    const faces = [];
    icoFaces.forEach(([a, b, c], fi) => { for (let i = 3; i >= 1; i--) { for (let j = 0; j <= 3-i; j++) { const k = 3 - i - j; faces.push([getVertIdx(fi, a, b, c, i, j, k), getVertIdx(fi, a, b, c, i-1, j+1, k), getVertIdx(fi, a, b, c, i-1, j, k+1)]); } } for (let i = 2; i >= 0; i--) { for (let j = 1; j <= 3-i; j++) { const k = 3 - i - j; if (k >= 1) faces.push([getVertIdx(fi, a, b, c, i, j, k), getVertIdx(fi, a, b, c, i+1, j-1, k), getVertIdx(fi, a, b, c, i+1, j, k-1)]); } } });
    return buildStellatedUnits(verts, faces, S, 0.01);
  }

  _generateRhombicosidodecahedron() {
    const phi = (1 + Math.sqrt(5)) / 2, S = 0.3;
    const phi2 = phi + 1, phi3 = 2*phi + 1, twoPhi = 2*phi, twoPlusPhi = 2 + phi;
    const rawVerts = [];
    const evenPerms = (a, b, c) => [[a,b,c], [b,c,a], [c,a,b]];
    const addSV = (a, b, c) => { for (const [x, y, z] of evenPerms(a, b, c)) for (const sx of (x === 0 ? [1] : [1,-1])) for (const sy of (y === 0 ? [1] : [1,-1])) for (const sz of (z === 0 ? [1] : [1,-1])) rawVerts.push([sx*x, sy*y, sz*z]); };
    addSV(1, 1, phi3); addSV(phi2, phi, twoPhi); addSV(twoPlusPhi, 0, phi2);
    const seen = new Set(), verts = [];
    rawVerts.forEach(v => { const key = v.map(c => c.toFixed(6)).join(','); if (!seen.has(key)) { seen.add(key); verts.push(v.map(c => c * S)); } });
    const dist2 = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
    let minD2 = Infinity;
    for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) { const d = dist2(verts[i], verts[j]); if (d < minD2) minD2 = d; }
    const edgeTol = minD2 * 0.01, adj = verts.map(() => []);
    for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) if (Math.abs(dist2(verts[i], verts[j]) - minD2) < edgeTol) { adj[i].push(j); adj[j].push(i); }
    for (let vi = 0; vi < verts.length; vi++) { const n = normalize(verts[vi]), ref = normalize(sub(verts[adj[vi][0]], verts[vi])), tang = cross(n, ref); adj[vi].sort((a, b) => { const da = sub(verts[a], verts[vi]), db = sub(verts[b], verts[vi]); return Math.atan2(dot(da, tang), dot(da, ref)) - Math.atan2(dot(db, tang), dot(db, ref)); }); }
    const faces = [], usedHE = new Set();
    for (let u = 0; u < verts.length; u++) for (const v of adj[u]) { const heKey = u + ',' + v; if (usedHE.has(heKey)) continue; const face = []; let cu = u, cv = v, safety = 0; while (safety++ < 20) { face.push(cu); usedHE.add(cu + ',' + cv); const nbrs = adj[cv], idx = nbrs.indexOf(cu), nextIdx = (idx - 1 + nbrs.length) % nbrs.length; const next = nbrs[nextIdx]; cu = cv; cv = next; if (cu === u && cv === v) break; } if (face.length >= 3 && face.length <= 6) faces.push(face); }
    return buildStellatedUnits(verts, faces, S, 0.015);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}

const UNIT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c,
  0xd35400, 0x27ae60, 0x2980b9, 0x8e44ad, 0xc0392b, 0x16a085,
  0xe67e22, 0x3498db, 0xe91e63, 0x00bcd4, 0x8bc34a, 0xff9800,
  0x673ab7, 0x009688, 0xf44336, 0x03a9f4, 0xcddc39, 0xff5722,
  0x9c27b0, 0x4caf50, 0x2196f3, 0xffeb3b, 0x795548, 0x607d8b,
];
