/**
 * Utility to parse OBJ files and convert them into Sonobe unit definitions.
 * This allows approximating arbitrary shapes by replacing each edge with a unit.
 */

export class OBJSonobeConverter {
  static parse(text) {
    const verts = [];
    const faces = [];
    const lines = text.split(/\r?\n/);

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('v ')) {
        const parts = line.split(/\s+/).slice(1).map(Number);
        verts.push(parts);
      } else if (line.startsWith('f ')) {
        const parts = line.split(/\s+/).slice(1);
        const faceIndices = parts.map(p => {
          // OBJ indices are 1-based, can also have v/vt/vn
          return parseInt(p.split('/')[0]) - 1;
        });
        faces.push(faceIndices);
      }
    }
    return { verts, faces };
  }

  /**
   * Robust version of buildStellatedUnits for arbitrary meshes.
   */
  static buildUnitsFromMesh(verts, faces, scale = 1.0, ridgeFrac = 0.05) {
    const V3 = {
      add: (a, b) => a.map((v, i) => v + b[i]),
      sub: (a, b) => a.map((v, i) => v - b[i]),
      scl: (a, s) => a.map(v => v * s),
      dot: (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
      cross: (a, b) => [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
      ],
      len: (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0)),
      normalize: (a) => { const l = Math.sqrt(a.reduce((s, v) => s + v * v, 0)); return l > 0 ? a.map(v => v/l) : a; }
    };

    // Calculate centroids and approximate normals for each face
    const faceData = faces.map(f => {
      const centroid = f.reduce((acc, vi) => V3.add(acc, verts[vi]), [0,0,0]).map(v => v / f.length);
      
      // Approximate normal using first 3 vertices
      const v0 = verts[f[0]], v1 = verts[f[1]], v2 = verts[f[2]];
      const normal = V3.normalize(V3.cross(V3.sub(v1, v0), V3.sub(v2, v0)));
      
      // Ensure normal points outward (away from mesh center)
      if (V3.dot(normal, centroid) < 0) {
        normal.forEach((v, i) => normal[i] = -v);
      }

      // Pyramid apex: centroid + some height
      // Height should be proportional to edge length for ~90 deg spikes
      // Avg edge length of face:
      let sumL = 0;
      for(let i=0; i<f.length; i++) sumL += V3.len(V3.sub(verts[f[i]], verts[f[(i+1)%f.length]]));
      const avgL = sumL / f.length;
      const apexH = avgL * 0.4; // 0.5 would be roughly 90 deg for triangles
      
      const apex = V3.add(centroid, V3.scl(normal, apexH));
      return { centroid, normal, apex };
    });

    // Extract unique edges and map to adjacent faces
    const edgeMap = new Map();
    faces.forEach((f, fi) => {
      for (let k = 0; k < f.length; k++) {
        const i = f[k], j = f[(k+1) % f.length];
        const key = Math.min(i, j) + ',' + Math.max(i, j);
        if (!edgeMap.has(key)) {
          edgeMap.set(key, { verts: [i, j], faces: [] });
        }
        edgeMap.get(key).faces.push(fi);
      }
    });

    const ridge = scale * ridgeFrac;

    return Array.from(edgeMap.values()).map(edge => {
      const A = verts[edge.verts[0]], B = verts[edge.verts[1]];
      
      // If edge only has 1 face (boundary), duplicate it or handle differently
      const f1 = edge.faces[0];
      const f2 = edge.faces[1] !== undefined ? edge.faces[1] : f1;
      
      const apex1 = faceData[f1].apex;
      const apex2 = faceData[f2].apex;

      // Ridge direction: avg of face normals
      const n1 = faceData[f1].normal;
      const n2 = faceData[f2].normal;
      const ridgeDir = V3.normalize(V3.add(n1, n2));
      
      const A_r = V3.add(A, V3.scl(ridgeDir, ridge));
      const B_r = V3.add(B, V3.scl(ridgeDir, ridge));

      const b1 = [A_r, B_r, apex1];
      const b2 = [A_r, B_r, apex2];

      const tabLeg = V3.len(V3.sub(B, A)) / 2;
      const tipA = V3.sub(A, V3.scl(n1, tabLeg));
      const tipB = V3.sub(B, V3.scl(n2, tabLeg));

      return { b1, b2, t1: [A_r, apex1, tipA], t2: [B_r, apex2, tipB] };
    });
  }
}
