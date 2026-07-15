/**
 * Kinematic fold model for the Keel unit — the app-original open-frame
 * edge module (see plans/keel-unit.md). Same architecture as
 * gv-fold-model.js: every step is a flat fold, authored as static regions
 * (convex polygon + stack level) plus fold groups rotating about a hinge.
 *
 * Paper: 3 x 1 rectangle. The strip after the sleeve fold occupies
 * y in [0.25, 0.75] with the slit at y = 0.5. Pentagon miter (54°).
 */

export const PLY = 0.012;

const W = 3;
// Pentagon miter: the crease climbs the 0.5-tall strip at 54°.
const DX = 0.5 / Math.tan(54 * Math.PI / 180); // ≈ 0.36327
const DX2 = DX / 2;                            // crease crossing at y = 0.5
// Folded left tab = wedge reflected across its crease; the free corner
// (0, 0.75) reflects to:
const TIP = [0.4755283, 0.4045085];
// Where the folded tab's long edge crosses y = 0.5:
const XC = 0.4445012;

const mirror = (poly) => poly.map(([x, y]) => [W - x, y]);

// Strip pieces (left-side coordinates; right side is mirrored).
const WEDGE_L = [[0, 0.25], [DX, 0.75], [0, 0.75]];
const BAND_LOW = [[0, 0.25], [W, 0.25], [W - DX2, 0.5], [DX2, 0.5]];
const BAND_HIGH = [[DX2, 0.5], [W - DX2, 0.5], [W - DX, 0.75], [DX, 0.75]];
const TAB_LOW_L = [[0, 0.25], [DX2, 0.5], [XC, 0.5], TIP];
const TAB_HIGH_L = [[DX2, 0.5], [DX, 0.75], [XC, 0.5]];

const MITER_DIR = [Math.sin(36 * Math.PI / 180), Math.cos(36 * Math.PI / 180)]; // along the 54° crease

function plies(poly, ...levels) {
  return levels.map((level) => ({ poly, level }));
}

const STEPS = {
  paper: {
    regions: plies([[0, 0], [W, 0], [W, 1], [0, 1]], 0),
    groups: [],
  },

  // Fold in half lengthwise to crease the center line, then open back up.
  crease: {
    regions: plies([[0, 0.5], [W, 0.5], [W, 1], [0, 1]], 0),
    groups: [{
      hinge: { p: [0, 0.5], d: [1, 0] }, dir: +1, window: [0, 1], release: true,
      regions: [{ poly: [[0, 0], [W, 0], [W, 0.5], [0, 0.5]], level: 0, endLevel: 1 }],
    }],
    creases: [{ a: [0, 0.5], b: [W, 0.5], level: 0.5, after: 0.95 }],
  },

  // Sleeve fold: both long edges to the center crease (bottom, then top).
  sleeve: {
    regions: plies([[0, 0.25], [W, 0.25], [W, 0.75], [0, 0.75]], 0),
    groups: [
      {
        hinge: { p: [0, 0.25], d: [1, 0] }, dir: +1, window: [0, 0.5],
        regions: [{ poly: [[0, 0], [W, 0], [W, 0.25], [0, 0.25]], level: 0, endLevel: 1 }],
      },
      {
        hinge: { p: [0, 0.75], d: [1, 0] }, dir: +1, window: [0.5, 1],
        regions: [{ poly: [[0, 0.75], [W, 0.75], [W, 1], [0, 1]], level: 0, endLevel: 1 }],
      },
    ],
  },

  // Miter the ends: fold each end wedge (both plies) behind, along the
  // 54° crease through the bottom corner.
  miter: {
    regions: [
      { poly: [[0, 0.25], [W, 0.25], [W - DX, 0.75], [DX, 0.75]], level: 0 },
      { poly: [[0, 0.25], [W, 0.25], [W - DX2, 0.5], [DX2, 0.5]], level: 1 },
      { poly: [[DX2, 0.5], [W - DX2, 0.5], [W - DX, 0.75], [DX, 0.75]], level: 1 },
    ],
    groups: [
      {
        hinge: { p: [0, 0.25], d: MITER_DIR }, dir: -1, window: [0, 0.5],
        regions: [
          { poly: WEDGE_L, level: 0, endLevel: -1 },
          { poly: WEDGE_L, level: 1, endLevel: -2 },
        ],
      },
      {
        hinge: { p: [W, 0.25], d: [-MITER_DIR[0], MITER_DIR[1]] }, dir: -1, window: [0.5, 1],
        regions: [
          { poly: mirror(WEDGE_L), level: 0, endLevel: -1 },
          { poly: mirror(WEDGE_L), level: 1, endLevel: -2 },
        ],
      },
    ],
  },

  // Keel fold: fold the strip in half lengthwise, away from the viewer.
  // The upper half (including the folded tab plies) wraps behind.
  keel: {
    regions: [
      { poly: BAND_LOW, level: 0 },
      { poly: BAND_LOW, level: 1 },
      { poly: TAB_LOW_L, level: -1 },
      { poly: TAB_LOW_L, level: -2 },
      { poly: mirror(TAB_LOW_L), level: -1 },
      { poly: mirror(TAB_LOW_L), level: -2 },
    ],
    groups: [{
      hinge: { p: [0, 0.5], d: [1, 0] }, dir: -1, window: [0, 1],
      // Moving stack levels {1, 0, -1, -2} land reversed behind the
      // deepest static layer: level -> -5 - level.
      regions: [
        { poly: BAND_HIGH, level: 0, endLevel: -5 },
        { poly: BAND_HIGH, level: 1, endLevel: -6 },
        { poly: TAB_HIGH_L, level: -1, endLevel: -4 },
        { poly: TAB_HIGH_L, level: -2, endLevel: -3 },
        { poly: mirror(TAB_HIGH_L), level: -1, endLevel: -4 },
        { poly: mirror(TAB_HIGH_L), level: -2, endLevel: -3 },
      ],
    }],
  },
};

export const KEEL_STEP_IDS = Object.keys(STEPS);

export function getKeelStepModel(stepId) {
  return STEPS[stepId] || STEPS.paper;
}

// --- Geometry math (same scheme as gv-fold-model.js) -------------------------

function reflect2D([x, y], { p, d }) {
  const vx = x - p[0];
  const vy = y - p[1];
  const dot = vx * d[0] + vy * d[1];
  return [p[0] + 2 * dot * d[0] - vx, p[1] + 2 * dot * d[1] - vy];
}

function rotateAboutHinge([x, y, z], { p, d }, theta) {
  const vx = x - p[0];
  const vy = y - p[1];
  const vz = z;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const dot = vx * d[0] + vy * d[1];
  const cx_ = d[1] * vz;
  const cy_ = -d[0] * vz;
  const cz_ = d[0] * vy - d[1] * vx;
  return [
    p[0] + vx * cos + cx_ * sin + d[0] * dot * (1 - cos),
    p[1] + vy * cos + cy_ * sin + d[1] * dot * (1 - cos),
    vz * cos + cz_ * sin,
  ];
}

function centroid(poly) {
  let sx = 0; let sy = 0;
  for (const [x, y] of poly) { sx += x; sy += y; }
  return [sx / poly.length, sy / poly.length];
}

function orientForLevel(poly, level) {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    area += x1 * y2 - x2 * y1;
  }
  const ccw = area > 0;
  const wantCCW = ((level % 2) + 2) % 2 === 0;
  return ccw === wantCCW ? poly : [...poly].reverse();
}

export function computeKeelGeometry(stepId, t) {
  const model = getKeelStepModel(stepId);
  const faces = [];

  for (const r of model.regions) {
    faces.push({
      pts: orientForLevel(r.poly, r.level).map(([x, y]) => [x, y, r.level * PLY]),
      moving: false,
    });
  }

  for (const group of model.groups) {
    const [t0, t1] = group.window;
    let local = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
    local = Math.max(0, Math.min(1, local));
    if (group.release) local = local <= 0.5 ? local * 2 : 2 - local * 2;
    const theta = Math.PI * local;

    const probe = [...centroid(group.regions[0].poly), 0];
    const lifted = rotateAboutHinge(probe, group.hinge, 0.3);
    const spin = (Math.sign(lifted[2]) === Math.sign(group.dir)) ? 1 : -1;

    for (const r of group.regions) {
      const pts = orientForLevel(r.poly, r.level).map(([x, y]) => {
        const start = [x, y, r.level * PLY];
        const rot = rotateAboutHinge(start, group.hinge, theta * spin);
        const [mx, my] = reflect2D([x, y], group.hinge);
        const target = [mx, my, r.endLevel * PLY];
        const atPi = rotateAboutHinge(start, group.hinge, Math.PI * spin);
        const k = theta / Math.PI;
        return [
          rot[0] + k * (target[0] - atPi[0]),
          rot[1] + k * (target[1] - atPi[1]),
          rot[2] + k * (target[2] - atPi[2]),
        ];
      });
      faces.push({ pts, moving: local > 0 && local < 1 });
    }
  }

  const creases = [];
  for (const c of model.creases || []) {
    if (t >= c.after) {
      creases.push({
        a: [c.a[0], c.a[1], c.level * PLY],
        b: [c.b[0], c.b[1], c.level * PLY],
      });
    }
  }

  return { faces, creases, flip: false };
}
