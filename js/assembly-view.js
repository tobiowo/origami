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
    this.animationId = null;
    this.ready = false;
    this.modelType = 6;
    this.unitCount = 0;
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
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    this._onResize = () => this._handleResize();
    window.addEventListener('resize', this._onResize);

    this.ready = true;
    this._animate();
  }

  setModelType(type) {
    this.modelType = parseInt(type);
    this.setUnitCount(this.unitCount);
  }

  setUnitCount(count) {
    this.unitCount = count;
    if (!this.ready) return;

    this.units.forEach(u => this.scene.remove(u));
    this.units = [];

    const defs = this._getUnitDefs();
    const n = Math.min(defs.length, count);
    
    for (let i = 0; i < n; i++) {
      const unit = this._createUnit(defs[i], i);
      this.scene.add(unit);
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
    this.animationId = requestAnimationFrame(() => this._animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
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
    });

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1.5 });

    // A true Sonobe unit has 4 parts: 2 body triangles, 2 tab triangles.
    // The "body" is the central square folded into 2 triangles.
    // The "tabs" are the triangular ends.
    [def.b1, def.b2, def.t1, def.t2].forEach(verts => {
      if (!verts) return;
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
    const phi = (1 + Math.sqrt(5)) / 2;
    const S = 0.35;  // scale for visibility

    // Truncated icosahedron vertices (even permutations of):
    // (0, ±1, ±3φ), (±1, ±(2+φ), ±2φ), (±2, ±(1+2φ), ±φ),
    // (±φ², ±2, ±(2φ+1)) — using φ²=φ+1
    const twoPhiPlus1 = 2*phi + 1;
    const twoPlusPhi = 2 + phi;
    const threePhi = 3 * phi;
    const twoPhi = 2 * phi;

    const rawVerts = [];

    // Generate all even permutations with sign variations
    const evenPerms = (a, b, c) => {
      // Even permutations of (a, b, c): (a,b,c), (b,c,a), (c,a,b)
      return [[a,b,c], [b,c,a], [c,a,b]];
    };

    const addSignVariants = (a, b, c) => {
      const perms = evenPerms(a, b, c);
      for (const [x, y, z] of perms) {
        for (const sx of (x === 0 ? [1] : [1, -1])) {
          for (const sy of (y === 0 ? [1] : [1, -1])) {
            for (const sz of (z === 0 ? [1] : [1, -1])) {
              rawVerts.push([sx*x, sy*y, sz*z]);
            }
          }
        }
      }
    };

    // 3 coordinate families for truncated icosahedron:
    // (0, ±1, ±3φ), (±1, ±(2+φ), ±2φ), (±φ, ±2, ±(2φ+1))
    addSignVariants(0, 1, threePhi);
    addSignVariants(1, twoPlusPhi, twoPhi);
    addSignVariants(phi, 2, twoPhiPlus1);

    // Remove duplicates (floating point)
    const uniqueVerts = [];
    const seen = new Set();
    rawVerts.forEach(v => {
      const key = v.map(c => c.toFixed(6)).join(',');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueVerts.push(v.map(c => c * S));
      }
    });

    const verts = uniqueVerts;  // Should be 60 vertices

    // Build faces by finding co-planar vertex groups
    // Each face is a regular polygon (pentagon or hexagon)
    // We use the icosahedron face normals and vertex normals to identify faces.

    // Approach: use face normals of the truncated icosahedron.
    // Pentagon normals = icosahedron vertex directions (12)
    // Hexagon normals = icosahedron face normals (20)
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

    // Pentagon normals: from icosahedron vertices (12 directions)
    const pentNormals = icoVerts.map(v => normalize(v));
    // Hexagon normals: from icosahedron face centroids (20 directions)
    const hexNormals = icoFaces.map(f => {
      const c = scl(add3(icoVerts[f[0]], icoVerts[f[1]], icoVerts[f[2]]), 1/3);
      return normalize(c);
    });

    const allNormals = [...pentNormals, ...hexNormals];

    // For each normal, find vertices that lie on that face plane
    // (highest dot product with the normal)
    const faces = [];
    for (const fn of allNormals) {
      // Find the max dot product
      const dots = verts.map(v => dot(v, fn));
      const maxDot = Math.max(...dots);
      // Vertices on this face have dot ≈ maxDot
      const faceVerts = [];
      dots.forEach((d, i) => {
        if (Math.abs(d - maxDot) < 0.001 * S) faceVerts.push(i);
      });

      if (faceVerts.length < 3) continue;

      // Order vertices cyclically around the face
      const center = scl(faceVerts.reduce((a, vi) => add(a, verts[vi]), [0,0,0]), 1/faceVerts.length);
      // Build a local 2D coordinate system on the face plane
      const u = normalize(sub(verts[faceVerts[0]], center));
      const v = cross(fn, u);
      // Sort by angle
      faceVerts.sort((a, b) => {
        const da = sub(verts[a], center);
        const db = sub(verts[b], center);
        return Math.atan2(dot(da, v), dot(da, u)) - Math.atan2(dot(db, v), dot(db, u));
      });

      faces.push(faceVerts);
    }

    return buildStellatedUnits(verts, faces, S, 0.02);
  }

  _generateRhombicosidodecahedron() {
    // Stellated rhombicosidodecahedron:
    // 20 triangles + 30 squares + 12 pentagons = 62 faces, 120 edges → 120 units.
    const phi = (1 + Math.sqrt(5)) / 2;
    const S = 0.3;  // scale for visibility

    // Rhombicosidodecahedron vertices are even permutations of:
    // (±1, ±1, ±φ³), (±φ², ±φ, ±2φ), (±(2+φ), 0, ±φ²)
    // where φ³ = 2φ+1, φ² = φ+1
    const phi2 = phi + 1;
    const phi3 = 2*phi + 1;
    const twoPhi = 2 * phi;
    const twoPlusPhi = 2 + phi;

    const rawVerts = [];

    const evenPerms = (a, b, c) => [[a,b,c], [b,c,a], [c,a,b]];

    const addSignVariants = (a, b, c) => {
      const perms = evenPerms(a, b, c);
      for (const [x, y, z] of perms) {
        for (const sx of (x === 0 ? [1] : [1, -1])) {
          for (const sy of (y === 0 ? [1] : [1, -1])) {
            for (const sz of (z === 0 ? [1] : [1, -1])) {
              rawVerts.push([sx*x, sy*y, sz*z]);
            }
          }
        }
      }
    };

    addSignVariants(1, 1, phi3);
    addSignVariants(phi2, phi, twoPhi);
    addSignVariants(twoPlusPhi, 0, phi2);

    // Remove duplicates
    const uniqueVerts = [];
    const seen = new Set();
    rawVerts.forEach(v => {
      const key = v.map(c => c.toFixed(6)).join(',');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueVerts.push(v.map(c => c * S));
      }
    });

    const verts = uniqueVerts;  // Should be 60 vertices

    // Build faces using face normals.
    // Triangle normals: icosahedron vertex directions (12 × but we need 20 triangle normals)
    // Actually: triangle normals = icosahedron face normals (20),
    //           square normals = icosidodecahedron edge midpoints (30),
    //           pentagon normals = icosahedron vertex directions (12).
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

    // Get icosahedron edges for square normals
    const icoEdgeSet = new Set();
    const icoEdgeMids = [];
    icoFaces.forEach(f => {
      for (let k = 0; k < 3; k++) {
        const a = f[k], b = f[(k+1)%3];
        const key = Math.min(a,b) + ',' + Math.max(a,b);
        if (!icoEdgeSet.has(key)) {
          icoEdgeSet.add(key);
          icoEdgeMids.push(normalize(mid(icoVerts[a], icoVerts[b])));
        }
      }
    });

    // 20 triangle normals (icosahedron face centroids)
    const triNormals = icoFaces.map(f =>
      normalize(scl(add3(icoVerts[f[0]], icoVerts[f[1]], icoVerts[f[2]]), 1/3))
    );
    // 30 square normals (icosahedron edge midpoints)
    const sqNormals = icoEdgeMids;
    // 12 pentagon normals (icosahedron vertices)
    const pentNormals = icoVerts.map(v => normalize(v));

    const allNormals = [...triNormals, ...sqNormals, ...pentNormals];

    const faces = [];
    for (const fn of allNormals) {
      const dots = verts.map(v => dot(v, fn));
      const maxDot = Math.max(...dots);
      const faceVerts = [];
      dots.forEach((d, i) => {
        if (Math.abs(d - maxDot) < 0.001 * S) faceVerts.push(i);
      });
      if (faceVerts.length < 3) continue;

      // Order cyclically
      const center = scl(faceVerts.reduce((a, vi) => add(a, verts[vi]), [0,0,0]), 1/faceVerts.length);
      const u = normalize(sub(verts[faceVerts[0]], center));
      const v = cross(fn, u);
      faceVerts.sort((a, b) => {
        const da = sub(verts[a], center);
        const db = sub(verts[b], center);
        return Math.atan2(dot(da, v), dot(da, u)) - Math.atan2(dot(db, v), dot(db, u));
      });
      faces.push(faceVerts);
    }

    return buildStellatedUnits(verts, faces, S, 0.015);
  }
}

const UNIT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c,
  0xd35400, 0x27ae60, 0x2980b9, 0x8e44ad, 0xc0392b, 0x16a085,
  0xe67e22, 0x3498db, 0xe91e63, 0x00bcd4, 0x8bc34a, 0xff9800,
  0x673ab7, 0x009688, 0xf44336, 0x03a9f4, 0xcddc39, 0xff5722,
  0x9c27b0, 0x4caf50, 0x2196f3, 0xffeb3b, 0x795548, 0x607d8b,
];
