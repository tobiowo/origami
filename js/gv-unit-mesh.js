/**
 * 3D geometry for an assembled Golden Venture (GV) unit.
 * Used for high-performance assembly rendering (InstancedMesh).
 *
 * The folded unit is a triangular wedge: thick at the base (where the two
 * pockets are) and tapering toward the apex (the two points). The front and
 * back faces carry a slight ridge along the center crease so the facets
 * catch the light like real folded paper. Local frame: base on y=0 centered
 * at the origin, apex up (+y), faces toward ±z; +z is the side that faces
 * outward when assembled.
 */

export const GV_UNIT = {
  WIDTH: 0.5,   // base width
  HEIGHT: 0.48, // apex height
  THICK: 0.16,  // thickness at the base center
};

export function createGVUnitGeometry(THREE) {
  const W = GV_UNIT.WIDTH;
  const H = GV_UNIT.HEIGHT;
  const TC = GV_UNIT.THICK / 2;  // base center half-thickness (crease ridge)
  const TE = 0.05;               // base corner half-thickness
  const TA = 0.012;              // apex half-thickness

  // Key vertices
  const BL = [-W / 2, 0]; // base left
  const BC = [0, 0];      // base center (crease)
  const BR = [W / 2, 0];  // base right
  const AP = [0, H];      // apex

  const tris = [];
  const tri = (a, b, c) => tris.push(a, b, c);

  // Front (+z) and back (−z) faces: two facets each, meeting at the ridge.
  const fBL = [...BL, TE], fBC = [...BC, TC], fBR = [...BR, TE], fAP = [...AP, TA];
  const bBL = [...BL, -TE], bBC = [...BC, -TC], bBR = [...BR, -TE], bAP = [...AP, -TA];

  tri(fBL, fBC, fAP);
  tri(fBC, fBR, fAP);
  tri(bBC, bBL, bAP);
  tri(bBR, bBC, bAP);

  // Slanted side edges (paper edge of the wedge)
  tri(fBL, fAP, bAP);
  tri(fBL, bAP, bBL);
  tri(fBR, bAP, fAP);
  tri(fBR, bBR, bAP);

  // Bottom: two pocket faces meeting at the center crease, slightly
  // recessed toward the apex to suggest the pocket openings.
  const pocketDepth = 0.06;
  const pBL = [BL[0] * 0.92, pocketDepth, 0];
  const pBR = [BR[0] * 0.92, pocketDepth, 0];
  tri(fBL, bBL, pBL);
  tri(fBL, pBL, fBC);
  tri(bBL, bBC, pBL);
  tri(fBC, pBL, bBC);
  tri(bBR, fBR, pBR);
  tri(fBR, fBC, pBR);
  tri(bBC, bBR, pBR);
  tri(pBR, fBC, bBC);

  const verts = new Float32Array(tris.flat());
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}
