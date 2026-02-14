/**
 * Mathematically accurate Three.js scene for multi-unit Sonobe assembly.
 * Units are constructed with 2 body triangles and 2 tab triangles.
 */

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

// ── Helper: build stellated polyhedron units from faces + vertices ───
// Given a polyhedron { V[], faces[][] }, builds Sonobe units (one per edge).
// Each face gets a pyramid with 90° apex angle.
function buildStellatedUnits(verts, faces, scale, ridgeFrac) {
  // Compute face edge length from first face
  const faceEdge = len(sub(verts[faces[0][0]], verts[faces[0][1]]));

  // Pyramid apex height for right-angle (90°) apex:
  //   lateral = faceEdge / sqrt(2)  (so apex angle between two laterals = 90°)
  //   circumR = circumradius of regular polygon face
  //   h = sqrt(lateral² - circumR²)
  const lateral = faceEdge / Math.sqrt(2);

  // Compute circumradius for each face (works for any regular polygon)
  const faceApices = faces.map(f => {
    const n = f.length; // number of sides
    const circumR = faceEdge / (2 * Math.sin(Math.PI / n));
    const apexH = Math.sqrt(Math.max(0, lateral * lateral - circumR * circumR));
    const centroid = f.reduce((acc, vi) => add(acc, verts[vi]), [0,0,0]);
    const cent = scl(centroid, 1 / n);
    const outDir = normalize(cent);
    return add(cent, scl(outDir, apexH));
  });

  // Extract unique edges
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

  // For each edge, find the two adjacent faces
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

    // Ridge direction: average of two adjacent face outward normals
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

    // Explode animation
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
    this.scene.background = new THREE.Color(0x0d0d1a);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    this.camera.position.set(3.5, 3, 3.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    containerEl.appendChild(this.renderer.domElement);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 2.0;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.3;
    this.controls.staticMoving = true;

    this.scene.add(new THREE.AmbientLight(0x404060, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    // Add a dynamic "cinematic" light
    this.dynamicLight = new THREE.PointLight(0xffffff, 0.8, 20);
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
      if (this.dynamicLight) this.dynamicLight.position.set(5, 5, 5);
    }
  }

  setModelType(type) {
    this.modelType = parseInt(type);
    this.setUnitCount(this.unitCount);
  }

  toggleExplode() {
    this.explodeTarget = this.explodeTarget === 0 ? 1 : 0;
    return this.explodeTarget === 1; // returns true if now exploding
  }

  setUnitCount(count) {
    this.unitCount = count;
    this.explodeProgress = 0;
    this.explodeTarget = 0;
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

  // --- Private ---

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

      // Explode/implode animation
      if (this.explodeProgress !== this.explodeTarget) {
        const dir = this.explodeTarget > this.explodeProgress ? 1 : -1;
        this.explodeProgress += dir * this.explodeSpeed * dt;
        this.explodeProgress = Math.max(0, Math.min(1, this.explodeProgress));
        // Snap to target when close
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
    // Ease in/out cubic
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

    const mat = new THREE.MeshPhongMaterial({
      color: color,
      side: THREE.DoubleSide,
      flatShading: true,
      transparent: true,
      opacity: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1.5 });

    // A true Sonobe unit has 4 parts: 2 body triangles, 2 tab triangles.
    // The "body" is the central square folded into 2 triangles.
    // The "tabs" are the triangular ends.
    // Compute centroid from all vertices for explode animation
    const allVerts = [def.b1, def.b2, def.t1, def.t2].filter(Boolean);
    const cx = new THREE.Vector3();
    let count = 0;
    allVerts.forEach(tri => {
      tri.forEach(v => { cx.x += v[0]; cx.y += v[1]; cx.z += v[2]; count++; });
    });
    cx.divideScalar(count);
    group.userData.centroid = cx;

    allVerts.forEach(verts => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts.flat()), 3));
      geo.setIndex([0, 1, 2]);
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    });

    return group;
  }

  _getUnitDefs() {
    switch(this.modelType) {
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

  _generateCube() {
    const S = 0.7;
    const C = [
      [-S,-S,-S], [S,-S,-S], [S,S,-S], [-S,S,-S],
      [-S,-S,S],  [S,-S,S],  [S,S,S],  [-S,S,S]
    ];
    const r = S * 0.12;

    // Inscribed tetrahedron {C[0],C[2],C[5],C[7]} picks one diagonal per face.
    const faces = [
      { diag: [5,7], others: [4,6], normal: [0,0,1]  },
      { diag: [0,2], others: [1,3], normal: [0,0,-1] },
      { diag: [2,7], others: [3,6], normal: [0,1,0]  },
      { diag: [0,5], others: [1,4], normal: [0,-1,0] },
      { diag: [2,5], others: [1,6], normal: [1,0,0]  },
      { diag: [0,7], others: [3,4], normal: [-1,0,0] },
    ];

    return faces.map(f => {
      const A = C[f.diag[0]], B = C[f.diag[1]];
      const P = C[f.others[0]], Q = C[f.others[1]];
      const n = f.normal;
      const A_r = add(A, scl(n, r));
      const B_r = add(B, scl(n, r));

      const tabLeg = S * 2;
      const makeTab = (diagPt, adjPt) => {
        const tipPt = sub(diagPt, scl(n, tabLeg));
        return [add(diagPt, scl(n, r)), adjPt, tipPt];
      };

      return {
        b1: [A_r, B_r, P],
        b2: [A_r, B_r, Q],
        t1: makeTab(A, P),
        t2: makeTab(B, Q),
      };
    });
  }

  _generateJewel() {
    // Toshie's Jewel: triangular bipyramid with right-angle apices.
    const a = 1.4;
    const h = a / Math.sqrt(6);

    const r = a / Math.sqrt(3);
    const E = [[r, 0, 0], [-r/2, 0, a/2], [-r/2, 0, -a/2]];
    const Top = [0, h, 0];
    const Bot = [0, -h, 0];

    const ridge = h * 0.15;
    const edges = [[0,1], [1,2], [2,0]];

    return edges.map(([i, j]) => {
      const A = E[i], B = E[j];
      const edgeDir = normalize(sub(B, A));
      const outward = normalize(cross(edgeDir, [0, 1, 0]));
      const edgeMid = mid(A, B);
      const out = dot(outward, edgeMid) > 0 ? outward : scl(outward, -1);
      const A_r = add(A, scl(out, ridge));
      const B_r = add(B, scl(out, ridge));

      const b1 = [A_r, B_r, Top];
      const b2 = [A_r, B_r, Bot];

      const fn1 = normalize(cross(sub(Top, A), sub(B, A)));
      const cent1 = scl(add3(A, B, Top), 1/3);
      const fn1out = dot(fn1, cent1) > 0 ? fn1 : scl(fn1, -1);

      const fn2 = normalize(cross(sub(Bot, B), sub(A, B)));
      const cent2 = scl(add3(A, B, Bot), 1/3);
      const fn2out = dot(fn2, cent2) > 0 ? fn2 : scl(fn2, -1);

      const tabLeg = a / 2;
      const tipA = sub(A, scl(fn1out, tabLeg));
      const tipB = sub(B, scl(fn2out, tabLeg));

      return { b1, b2, t1: [A_r, Top, tipA], t2: [B_r, Bot, tipB] };
    });
  }

  _generateOctahedron() {
    // Stellated octahedron: 8 triangular faces, 12 edges → 12 units.
    const S = 1.0;
    const verts = [[S,0,0], [-S,0,0], [0,S,0], [0,-S,0], [0,0,S], [0,0,-S]];
    const faces = [
      [0,2,4], [0,4,3], [0,3,5], [0,5,2],
      [1,4,2], [1,3,4], [1,5,3], [1,2,5]
    ];
    return buildStellatedUnits(verts, faces, S, 0.06);
  }

  _generateIcosahedron() {
    // Stellated icosahedron: 20 triangular faces, 30 edges → 30 units.
    const phi = (1 + Math.sqrt(5)) / 2;
    const S = 0.7;
    const verts = [
      [-1, phi, 0], [1, phi, 0], [-1,-phi, 0], [1,-phi, 0],
      [0,-1, phi], [0, 1, phi], [0,-1,-phi], [0, 1,-phi],
      [phi, 0,-1], [phi, 0, 1], [-phi, 0,-1], [-phi, 0, 1]
    ].map(p => p.map(c => c * S));
    const faces = [
      [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
      [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
      [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
      [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]
    ];
    return buildStellatedUnits(verts, faces, S, 0.04);
  }

  _generatePentakisDodecahedron() {
    // Spiked pentakis dodecahedron: icosidodecahedron base
    // (20 triangles + 12 pentagons = 32 faces, 60 edges → 60 units).
    // Each face gets a right-angle pyramid.
    const phi = (1 + Math.sqrt(5)) / 2;
    const S = 0.55;  // scale down for visibility

    // 30 icosidodecahedron vertices
    // These come in three sets of 10, from the 3 golden rectangles
    const raw = [
      // 12 vertices from permutations of (0, 0, ±φ)
      [0, 0, phi], [0, 0, -phi],
      [phi, 0, 0], [-phi, 0, 0],
      [0, phi, 0], [0, -phi, 0],
      // 12 vertices from permutations of (±1/2, ±φ/2, ±(1+φ)/2)
      // Actually, icosidodecahedron vertices are midpoints of icosahedron edges.
      // Easier to compute from icosahedron:
    ];

    // Build from icosahedron edge midpoints
    const icoVerts = [
      [-1, phi, 0], [1, phi, 0], [-1,-phi, 0], [1,-phi, 0],
      [0,-1, phi], [0, 1, phi], [0,-1,-phi], [0, 1,-phi],
      [phi, 0,-1], [phi, 0, 1], [-phi, 0,-1], [-phi, 0, 1]
    ];
    const icoFaces = [
      [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
      [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
      [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
      [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]
    ];

    // Get unique icosahedron edges → midpoints = icosidodecahedron vertices
    const icoEdgeSet = new Set();
    const icoEdges = [];
    icoFaces.forEach(f => {
      for (let k = 0; k < 3; k++) {
        const a = f[k], b = f[(k+1)%3];
        const key = Math.min(a,b) + ',' + Math.max(a,b);
        if (!icoEdgeSet.has(key)) {
          icoEdgeSet.add(key);
          icoEdges.push([a, b]);
        }
      }
    });

    // 30 vertices of icosidodecahedron = midpoints of icosahedron edges
    const idVerts = icoEdges.map(([a, b]) =>
      mid(icoVerts[a], icoVerts[b]).map(c => c * S)
    );

    // Build a lookup: icosahedron edge key → icosidodecahedron vertex index
    const edgeToIdx = {};
    icoEdges.forEach(([a, b], idx) => {
      edgeToIdx[Math.min(a,b) + ',' + Math.max(a,b)] = idx;
    });

    // Icosidodecahedron faces:
    // - 20 triangles (one per icosahedron face): midpoints of the 3 edges
    // - 12 pentagons (one per icosahedron vertex): midpoints of the 5 edges meeting at that vertex
    const triFaces = icoFaces.map(f => {
      const idxs = [];
      for (let k = 0; k < 3; k++) {
        const a = f[k], b = f[(k+1)%3];
        idxs.push(edgeToIdx[Math.min(a,b) + ',' + Math.max(a,b)]);
      }
      return idxs;
    });

    // For each icosahedron vertex, find all edges that include it → pentagon
    const pentFaces = [];
    for (let vi = 0; vi < 12; vi++) {
      const adjEdgeIdxs = [];
      icoEdges.forEach(([a, b], idx) => {
        if (a === vi || b === vi) adjEdgeIdxs.push(idx);
      });
      // Order them cyclically: each consecutive pair shares an icosahedron face
      const ordered = [adjEdgeIdxs[0]];
      const used = new Set([adjEdgeIdxs[0]]);
      while (ordered.length < adjEdgeIdxs.length) {
        const last = ordered[ordered.length - 1];
        const [la, lb] = icoEdges[last];
        const lastOther = la === vi ? lb : la;
        // Find next edge that shares a face with the current edge around vertex vi
        let found = false;
        for (const candidate of adjEdgeIdxs) {
          if (used.has(candidate)) continue;
          const [ca, cb] = icoEdges[candidate];
          const candOther = ca === vi ? cb : ca;
          // They share a face if there's an icosahedron face containing vi, lastOther, candOther
          const sharesFace = icoFaces.some(f =>
            f.includes(vi) && f.includes(lastOther) && f.includes(candOther)
          );
          if (sharesFace) {
            ordered.push(candidate);
            used.add(candidate);
            found = true;
            break;
          }
        }
        if (!found) break;
      }
      pentFaces.push(ordered);
    }

    const allFaces = [...triFaces, ...pentFaces];
    return buildStellatedUnits(idVerts, allFaces, S, 0.03);
  }

  _generateTruncatedIcosahedron() {
    // Stellated truncated icosahedron ("spiky football"):
    // 12 pentagons + 20 hexagons = 32 faces, 90 edges → 90 units.
    // Built combinatorially by truncating icosahedron vertices at 1/3 along each edge.
    const phi = (1 + Math.sqrt(5)) / 2;
    const S = 0.35;

    const icoVerts = [
      [-1, phi, 0], [1, phi, 0], [-1,-phi, 0], [1,-phi, 0],
      [0,-1, phi], [0, 1, phi], [0,-1,-phi], [0, 1,-phi],
      [phi, 0,-1], [phi, 0, 1], [-phi, 0,-1], [-phi, 0, 1]
    ];
    const icoFaces = [
      [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
      [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
      [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
      [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]
    ];

    // Extract 30 unique icosahedron edges
    const icoEdgeSet = new Set();
    const icoEdges = [];
    icoFaces.forEach(f => {
      for (let k = 0; k < 3; k++) {
        const a = f[k], b = f[(k+1)%3];
        const key = Math.min(a,b) + ',' + Math.max(a,b);
        if (!icoEdgeSet.has(key)) {
          icoEdgeSet.add(key);
          icoEdges.push([a, b]);
        }
      }
    });

    // Edge key → edge index lookup
    const edgeKeyToIdx = {};
    icoEdges.forEach(([a, b], idx) => {
      edgeKeyToIdx[Math.min(a,b) + ',' + Math.max(a,b)] = idx;
    });

    // 60 vertices: 2 per icosahedron edge (truncation at 1/3 from each end)
    // edgeIdx*2   = near icoEdges[edgeIdx][0]  (1/3 from vertex a)
    // edgeIdx*2+1 = near icoEdges[edgeIdx][1]  (1/3 from vertex b)
    const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const verts = [];
    icoEdges.forEach(([a, b]) => {
      verts.push(lerp(icoVerts[a], icoVerts[b], 1/3).map(c => c * S));  // near a
      verts.push(lerp(icoVerts[a], icoVerts[b], 2/3).map(c => c * S));  // near b
    });

    // Helper: get truncated vertex index "near vertex vi" on edge (a,b)
    const nearIdx = (edgeIdx, vi) => {
      const [a, b] = icoEdges[edgeIdx];
      return a === vi ? edgeIdx * 2 : edgeIdx * 2 + 1;
    };

    // Helper: get edge index for icosahedron edge between vertices a and b
    const getEdgeIdx = (a, b) => edgeKeyToIdx[Math.min(a,b) + ',' + Math.max(a,b)];

    // 12 Pentagon faces: one per icosahedron vertex
    // Each vertex has 5 incident edges; collect the "near-vi" vertex from each, order cyclically
    const pentFaces = [];
    for (let vi = 0; vi < 12; vi++) {
      const adjEdgeIdxs = [];
      icoEdges.forEach(([a, b], idx) => {
        if (a === vi || b === vi) adjEdgeIdxs.push(idx);
      });
      // Order cyclically using shared-face adjacency
      const ordered = [adjEdgeIdxs[0]];
      const used = new Set([adjEdgeIdxs[0]]);
      while (ordered.length < adjEdgeIdxs.length) {
        const last = ordered[ordered.length - 1];
        const [la, lb] = icoEdges[last];
        const lastOther = la === vi ? lb : la;
        for (const candidate of adjEdgeIdxs) {
          if (used.has(candidate)) continue;
          const [ca, cb] = icoEdges[candidate];
          const candOther = ca === vi ? cb : ca;
          if (icoFaces.some(f => f.includes(vi) && f.includes(lastOther) && f.includes(candOther))) {
            ordered.push(candidate);
            used.add(candidate);
            break;
          }
        }
        if (ordered.length === used.size) continue; // already added
        if (used.size < ordered.length) break; // stuck
      }
      pentFaces.push(ordered.map(ei => nearIdx(ei, vi)));
    }

    // 20 Hexagon faces: one per icosahedron face
    // For face [a,b,c], the hexagon has 6 vertices from truncating each corner:
    // [near-a on a-b, near-b on a-b, near-b on b-c, near-c on b-c, near-c on c-a, near-a on c-a]
    const hexFaces = icoFaces.map(([a, b, c]) => {
      const eAB = getEdgeIdx(a, b);
      const eBC = getEdgeIdx(b, c);
      const eCA = getEdgeIdx(c, a);
      return [
        nearIdx(eAB, a), nearIdx(eAB, b),
        nearIdx(eBC, b), nearIdx(eBC, c),
        nearIdx(eCA, c), nearIdx(eCA, a),
      ];
    });

    const faces = [...pentFaces, ...hexFaces];
    return buildStellatedUnits(verts, faces, S, 0.02);
  }

  _generateGeodesicIcosahedron270() {
    // Frequency-3 geodesic subdivision of icosahedron:
    // Each of 20 faces → 9 sub-triangles = 180 faces, 270 edges → 270 units.
    // 92 vertices: 12 original + 60 on edges (2 per edge) + 20 face centers.
    const phi = (1 + Math.sqrt(5)) / 2;
    const S = 0.25;  // scale down for large model

    const icoVerts = [
      [-1, phi, 0], [1, phi, 0], [-1,-phi, 0], [1,-phi, 0],
      [0,-1, phi], [0, 1, phi], [0,-1,-phi], [0, 1,-phi],
      [phi, 0,-1], [phi, 0, 1], [-phi, 0,-1], [-phi, 0, 1]
    ];
    const icoFaces = [
      [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
      [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
      [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
      [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]
    ];

    // Extract 30 unique icosahedron edges
    const icoEdgeSet = new Set();
    const icoEdges = [];
    icoFaces.forEach(f => {
      for (let k = 0; k < 3; k++) {
        const a = f[k], b = f[(k+1)%3];
        const key = Math.min(a,b) + ',' + Math.max(a,b);
        if (!icoEdgeSet.has(key)) {
          icoEdgeSet.add(key);
          icoEdges.push([a, b]);
        }
      }
    });

    const edgeKeyToIdx = {};
    icoEdges.forEach(([a, b], idx) => {
      edgeKeyToIdx[Math.min(a,b) + ',' + Math.max(a,b)] = idx;
    });

    // Vertex allocation:
    // - 12 original icosahedron vertices: indices 0..11
    // - 60 edge vertices (2 per edge): indices 12 + edgeIdx*2, 12 + edgeIdx*2 + 1
    //   For edge (a,b): index 12+edgeIdx*2 is at 1/3 from a, 12+edgeIdx*2+1 is at 2/3 from a
    // - 20 face center vertices: indices 12 + 60 + faceIdx = 72 + faceIdx
    // Total: 12 + 60 + 20 = 92

    const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

    // Compute all vertex positions (unscaled, on original icosahedron surface)
    const rawVerts = new Array(92);

    // Original 12 vertices
    for (let i = 0; i < 12; i++) rawVerts[i] = icoVerts[i].slice();

    // Edge vertices: 2 per edge at 1/3 and 2/3
    icoEdges.forEach(([a, b], idx) => {
      rawVerts[12 + idx*2]     = lerp3(icoVerts[a], icoVerts[b], 1/3);
      rawVerts[12 + idx*2 + 1] = lerp3(icoVerts[a], icoVerts[b], 2/3);
    });

    // Face center vertices
    icoFaces.forEach(([a, b, c], fi) => {
      rawVerts[72 + fi] = icoVerts[a].map((v, i) => (v + icoVerts[b][i] + icoVerts[c][i]) / 3);
    });

    // Project all vertices onto sphere and scale
    const sphereR = len(icoVerts[0]); // radius of icosahedron circumsphere
    const verts = rawVerts.map(v => {
      const r = len(v);
      return v.map(c => (c / r) * sphereR * S);
    });

    // Helper: get the global vertex index for a barycentric point (i,j,k) on face [a,b,c]
    // where i+j+k=3, point = (i/3)*A + (j/3)*B + (k/3)*C
    // i corresponds to vertex a, j to b, k to c
    const getVertIdx = (faceIdx, a, b, c, i, j, k) => {
      // Corner vertices (one coordinate = 3)
      if (i === 3) return a;
      if (j === 3) return b;
      if (k === 3) return c;

      // Edge vertices (one coordinate = 0)
      if (k === 0) {
        // On edge a-b: i+j=3, point at i/3 from a toward b... wait:
        // point = (i/3)*A + (j/3)*B, so distance from a is j/3
        // j=1 → 1/3 from a, j=2 → 2/3 from a
        const eIdx = edgeKeyToIdx[Math.min(a,b) + ',' + Math.max(a,b)];
        const [ea, eb] = icoEdges[eIdx];
        // Our convention: 12+eIdx*2 is at 1/3 from ea, 12+eIdx*2+1 is at 2/3 from ea
        const tFromA = j / 3; // fraction from a toward b
        // Convert to fraction from ea toward eb
        let tFromEa;
        if (ea === a) tFromEa = tFromA;
        else tFromEa = 1 - tFromA;
        // tFromEa = 1/3 → index 12+eIdx*2, tFromEa = 2/3 → index 12+eIdx*2+1
        return tFromEa < 0.5 ? 12 + eIdx*2 : 12 + eIdx*2 + 1;
      }
      if (j === 0) {
        // On edge a-c: i+k=3, distance from a toward c is k/3
        const eIdx = edgeKeyToIdx[Math.min(a,c) + ',' + Math.max(a,c)];
        const [ea] = icoEdges[eIdx];
        const tFromA = k / 3;
        let tFromEa = ea === a ? tFromA : 1 - tFromA;
        return tFromEa < 0.5 ? 12 + eIdx*2 : 12 + eIdx*2 + 1;
      }
      if (i === 0) {
        // On edge b-c: j+k=3, distance from b toward c is k/3
        const eIdx = edgeKeyToIdx[Math.min(b,c) + ',' + Math.max(b,c)];
        const [ea] = icoEdges[eIdx];
        const tFromB = k / 3;
        let tFromEa = ea === b ? tFromB : 1 - tFromB;
        return tFromEa < 0.5 ? 12 + eIdx*2 : 12 + eIdx*2 + 1;
      }

      // Interior point: i=1, j=1, k=1 → face center
      return 72 + faceIdx;
    };

    // Build 9 sub-triangles per icosahedron face
    // Barycentric grid for freq=3: row by row
    // Row r has points where i = 3-r (r counts from vertex a downward)
    // Sub-triangles: upward-pointing and downward-pointing
    const faces = [];
    icoFaces.forEach(([a, b, c], fi) => {
      // All barycentric triples (i,j,k) with i+j+k=3, 0≤i,j,k≤3
      // Arranged in a triangular grid. We enumerate sub-triangles:
      // For freq=3, the sub-triangles are:
      // Upward-pointing: for each (i,j,k) with i+j+k=3, i≥1, j≥0, k≥0:
      //   triangle at (i,j,k), (i-1,j+1,k), (i-1,j,k+1)
      // Downward-pointing: for each (i,j,k) with i+j+k=3, i≤2, j≥1, k≥1:
      //   triangle at (i,j,k), (i+1,j-1,k), (i+1,j,k-1)
      // Actually easier: enumerate row by row

      for (let i = 3; i >= 1; i--) {
        for (let j = 0; j <= 3-i; j++) {
          const k = 3 - i - j;
          // Upward-pointing triangle: (i,j,k), (i-1,j+1,k), (i-1,j,k+1)
          const v0 = getVertIdx(fi, a, b, c, i, j, k);
          const v1 = getVertIdx(fi, a, b, c, i-1, j+1, k);
          const v2 = getVertIdx(fi, a, b, c, i-1, j, k+1);
          faces.push([v0, v1, v2]);
        }
      }
      // Downward-pointing triangles
      for (let i = 2; i >= 0; i--) {
        for (let j = 1; j <= 3-i; j++) {
          const k = 3 - i - j;
          if (k < 0) continue;
          // Downward-pointing: (i,j,k), (i+1,j-1,k), (i+1,j,k-1)
          if (k >= 1) {
            const v0 = getVertIdx(fi, a, b, c, i, j, k);
            const v1 = getVertIdx(fi, a, b, c, i+1, j-1, k);
            const v2 = getVertIdx(fi, a, b, c, i+1, j, k-1);
            faces.push([v0, v1, v2]);
          }
        }
      }
    });

    return buildStellatedUnits(verts, faces, S, 0.01);
  }

  _generateRhombicosidodecahedron() {
    // Stellated rhombicosidodecahedron:
    // 20 triangles + 30 squares + 12 pentagons = 62 faces, 120 edges → 120 units.
    // Vertices from Cartesian coordinates, faces found via edge-graph traversal.
    const phi = (1 + Math.sqrt(5)) / 2;
    const S = 0.3;

    // Generate 60 vertices from even permutations of:
    // (±1, ±1, ±φ³), (±φ², ±φ, ±2φ), (±(2+φ), 0, ±φ²)
    const phi2 = phi + 1, phi3 = 2*phi + 1, twoPhi = 2*phi, twoPlusPhi = 2 + phi;
    const rawVerts = [];
    const evenPerms = (a, b, c) => [[a,b,c], [b,c,a], [c,a,b]];
    const addSV = (a, b, c) => {
      for (const [x, y, z] of evenPerms(a, b, c))
        for (const sx of (x === 0 ? [1] : [1,-1]))
          for (const sy of (y === 0 ? [1] : [1,-1]))
            for (const sz of (z === 0 ? [1] : [1,-1]))
              rawVerts.push([sx*x, sy*y, sz*z]);
    };
    addSV(1, 1, phi3);
    addSV(phi2, phi, twoPhi);
    addSV(twoPlusPhi, 0, phi2);

    const seen = new Set();
    const verts = [];
    rawVerts.forEach(v => {
      const key = v.map(c => c.toFixed(6)).join(',');
      if (!seen.has(key)) { seen.add(key); verts.push(v.map(c => c * S)); }
    });

    // Find edge length (minimum pairwise distance)
    const dist2 = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
    let minD2 = Infinity;
    for (let i = 0; i < verts.length; i++)
      for (let j = i + 1; j < verts.length; j++) {
        const d = dist2(verts[i], verts[j]);
        if (d < minD2) minD2 = d;
      }
    const edgeTol = minD2 * 0.01;  // 1% tolerance

    // Build adjacency list from edges
    const adj = verts.map(() => []);
    for (let i = 0; i < verts.length; i++)
      for (let j = i + 1; j < verts.length; j++) {
        if (Math.abs(dist2(verts[i], verts[j]) - minD2) < edgeTol) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }

    // Sort each vertex's neighbors cyclically (CCW when viewed from outside)
    for (let vi = 0; vi < verts.length; vi++) {
      const n = normalize(verts[vi]);  // outward normal (all verts on sphere)
      const ref = normalize(sub(verts[adj[vi][0]], verts[vi]));
      const tang = cross(n, ref);
      adj[vi].sort((a, b) => {
        const da = sub(verts[a], verts[vi]);
        const db = sub(verts[b], verts[vi]);
        return Math.atan2(dot(da, tang), dot(da, ref)) - Math.atan2(dot(db, tang), dot(db, ref));
      });
    }

    // Find faces via half-edge traversal:
    // For directed edge (u→v), next edge in CW face = (v → prev_ccw_neighbor_of_v_from_u)
    const faces = [];
    const usedHE = new Set();

    for (let u = 0; u < verts.length; u++) {
      for (const v of adj[u]) {
        const heKey = u + ',' + v;
        if (usedHE.has(heKey)) continue;

        const face = [];
        let cu = u, cv = v;
        let safety = 0;
        while (safety++ < 20) {
          face.push(cu);
          usedHE.add(cu + ',' + cv);
          // At vertex cv, find neighbor before cu in CCW order (= CW next)
          const nbrs = adj[cv];
          const idx = nbrs.indexOf(cu);
          const nextIdx = (idx - 1 + nbrs.length) % nbrs.length;
          const next = nbrs[nextIdx];
          cu = cv;
          cv = next;
          if (cu === u && cv === v) break;
        }
        if (face.length >= 3 && face.length <= 6) faces.push(face);
      }
    }

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
