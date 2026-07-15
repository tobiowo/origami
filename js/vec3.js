/**
 * Minimal array-based 3D vector helpers shared by the assembly generators.
 * Vectors are plain `[x, y, z]` arrays so they can be built cheaply before
 * being handed to Three.js.
 */
export const V3 = {
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

export const { mid, add, sub, scl, dot, cross, len, normalize, add3 } = V3;
