/**
 * Kinematic fold model for the Golden Venture (3D origami) unit.
 *
 * Every step of the GV unit is a flat fold: a stack of paper layers rotates
 * rigidly about a single hinge line until it lies flat again. Instead of
 * running a physics simulation (which collapses the layered paper), each
 * step is authored as:
 *   - a set of static regions (convex polygons + integer stack level), and
 *   - one or more fold groups (regions that rotate about a hinge line,
 *     with the stack level each region lands on when the fold completes).
 *
 * `computeGVGeometry(stepId, t)` returns world-space polygons for any
 * fold progress t in [0, 1] — pure geometry, no three.js dependency,
 * so it is directly unit-testable.
 *
 * Paper: 1.5 x 1.0 rectangle. After step 1 the working strip is
 * x in [0, 1.5], y in [0.5, 1.0], folded edge ("the crease") at the bottom.
 * Stack levels are integers; level * PLY is the z offset (+z faces the viewer).
 */

export const PLY = 0.012;

const CX = 0.75;       // vertical center line
const SQ = Math.SQRT1_2;

function rect(x0, y0, x1, y1) {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

// --- Frequently used polygons (derived once, by hand) -----------------------
// Strip after step 1: [0,1.5] x [0.5,1], two plies.
// Step 3 creases run from the bottom-center point (0.75, 0.5) up at 45°,
// reaching the top edge at (0.25, 1) and (1.25, 1).

const TRI = [[0.75, 0.5], [1.25, 1.0], [0.25, 1.0]];          // center triangle
const FLAP_L = [[0, 0.5], [0.75, 0.5], [0.25, 1.0], [0, 1.0]]; // left of step-3 crease
const FLAP_R = [[0.75, 0.5], [1.5, 0.5], [1.5, 1.0], [1.25, 1.0]];
// Folded step-3 flaps (reflections of FLAP_L / FLAP_R across their creases):
const FLAP_L_F = [[0.75, 0.5], [0.75, 1.25], [0.25, 1.25], [0.25, 1.0]];
const FLAP_R_F = [[0.75, 0.5], [1.25, 1.0], [1.25, 1.25], [0.75, 1.25]];
// Step 5 corner triangles (outer corners of the overhangs) and flap bodies:
const CORN_L = [[0.25, 1.0], [0.25, 1.25], [0.5, 1.25]];
const CORN_R = [[1.25, 1.0], [1.25, 1.25], [1.0, 1.25]];
const BODY_L = [[0.75, 0.5], [0.75, 1.25], [0.5, 1.25], [0.25, 1.0]];
const BODY_R = [[0.75, 0.5], [0.75, 1.25], [1.0, 1.25], [1.25, 1.0]];
// Folded corners lie flush along the top edge:
const CORN_L_F = [[0.25, 1.0], [0.5, 1.0], [0.5, 1.25]];
const CORN_R_F = [[1.25, 1.0], [1.0, 1.0], [1.0, 1.25]];
// Step 6 splits each flap body at the top edge (y = 1):
const BODY_L_LOW = [[0.75, 0.5], [0.75, 1.0], [0.25, 1.0]];
const BODY_R_LOW = [[0.75, 0.5], [1.25, 1.0], [0.75, 1.0]];
const OVER_L = [[0.25, 1.0], [0.75, 1.0], [0.75, 1.25], [0.5, 1.25]];
const OVER_R = [[1.25, 1.0], [0.75, 1.0], [0.75, 1.25], [1.0, 1.25]];
// Step 7 splits the center triangle at the center line:
const TRI_L = [[0.75, 0.5], [0.75, 1.0], [0.25, 1.0]];
const TRI_R = [[0.75, 0.5], [1.25, 1.0], [0.75, 1.0]];

function plies(poly, ...levels) {
  return levels.map((level) => ({ poly, level }));
}

/**
 * Step models. Conventions:
 *  - `regions`: static during the step.
 *  - `groups`: animated folds. Each region in a group carries the level it
 *    lands on (`endLevel`). `dir` is +1 to fold toward the viewer, -1 away.
 *    `window` maps overall progress t to this group (for sequential folds).
 *  - `release`: the fold opens back up (fold-to-crease steps): t runs the
 *    hinge 0 -> 180° -> 0.
 *  - `flip`: the whole model is turned around (handled by the view as a
 *    rotation); the listed regions are the state being flipped.
 *  - `creases`: line segments to draw once `after` <= t (crease marks).
 *
 * Levels follow the physical stacking: when a stack of layers
 * [l0..ln] folds onto a surface whose front is level L, the former
 * front layer lands deepest (L+1) and the former back layer on top.
 */
const STEPS = {
  paper: {
    regions: plies(rect(0, 0, 1.5, 1.0), 0),
    groups: [],
  },

  // Step 1: fold the bottom half up; folded edge ends at the bottom.
  step1: {
    regions: plies(rect(0, 0.5, 1.5, 1.0), 0),
    groups: [{
      hinge: { p: [0, 0.5], d: [1, 0] }, dir: +1, window: [0, 1],
      regions: [{ poly: rect(0, 0, 1.5, 0.5), level: 0, endLevel: 1 }],
    }],
  },

  // Step 2: fold in half to crease the center, then open back up.
  step2: {
    regions: plies(rect(0, 0.5, CX, 1.0), 0, 1),
    groups: [{
      hinge: { p: [CX, 0.5], d: [0, 1] }, dir: +1, window: [0, 1], release: true,
      regions: [
        { poly: rect(CX, 0.5, 1.5, 1.0), level: 0, endLevel: 3 },
        { poly: rect(CX, 0.5, 1.5, 1.0), level: 1, endLevel: 2 },
      ],
    }],
    creases: [{ a: [CX, 0.5], b: [CX, 1.0], level: 1.5, after: 0.95 }],
  },

  // Step 3: fold each bottom edge up against the center crease (left, then
  // right), forming the point at the bottom and two overhangs at the top.
  step3: {
    regions: plies(TRI, 0, 1),
    groups: [
      {
        hinge: { p: [CX, 0.5], d: [-SQ, SQ] }, dir: +1, window: [0, 0.5],
        regions: [
          { poly: FLAP_L, level: 0, endLevel: 3 },
          { poly: FLAP_L, level: 1, endLevel: 2 },
        ],
      },
      {
        hinge: { p: [CX, 0.5], d: [SQ, SQ] }, dir: +1, window: [0.5, 1],
        regions: [
          { poly: FLAP_R, level: 0, endLevel: 3 },
          { poly: FLAP_R, level: 1, endLevel: 2 },
        ],
      },
    ],
    creases: [{ a: [CX, 0.5], b: [CX, 1.0], level: 1.4, after: 0 }],
  },

  // Step 4: turn the piece around (the view rotates the model; the regions
  // here are the completed step-3 state).
  step4: {
    flip: true,
    regions: [
      ...plies(TRI, 0, 1),
      ...plies(FLAP_L_F, 2, 3),
      ...plies(FLAP_R_F, 2, 3),
    ],
    groups: [],
  },

  // From here on the model is in the flipped frame: the plain triangle face
  // is toward the viewer (levels 2,3); the step-3 flaps are behind (0,1).

  // Step 5: fold the outer corners of the overhangs toward the viewer so
  // their short edges lie along the top edge of the triangle.
  step5: {
    regions: [
      ...plies(TRI, 2, 3),
      ...plies(BODY_L, 0, 1),
      ...plies(BODY_R, 0, 1),
    ],
    groups: [
      {
        hinge: { p: [0.25, 1.0], d: [SQ, SQ] }, dir: +1, window: [0, 1],
        regions: [
          { poly: CORN_L, level: 0, endLevel: 3 },
          { poly: CORN_L, level: 1, endLevel: 2 },
        ],
      },
      {
        hinge: { p: [1.25, 1.0], d: [-SQ, SQ] }, dir: +1, window: [0, 1],
        regions: [
          { poly: CORN_R, level: 0, endLevel: 3 },
          { poly: CORN_R, level: 1, endLevel: 2 },
        ],
      },
    ],
  },

  // Step 6: wrap the overhangs (with their folded corners) down over the top
  // edge onto the front of the triangle. The corner folds end up flush with
  // the slanted edges of the triangle.
  step6: {
    regions: [
      ...plies(TRI, 2, 3),
      ...plies(BODY_L_LOW, 0, 1),
      ...plies(BODY_R_LOW, 0, 1),
    ],
    groups: [
      {
        hinge: { p: [0, 1.0], d: [1, 0] }, dir: +1, window: [0, 1],
        regions: [
          { poly: OVER_L, level: 0, endLevel: 7 },
          { poly: OVER_L, level: 1, endLevel: 6 },
          { poly: CORN_L_F, level: 2, endLevel: 5 },
          { poly: CORN_L_F, level: 3, endLevel: 4 },
        ],
      },
      {
        hinge: { p: [0, 1.0], d: [1, 0] }, dir: +1, window: [0, 1],
        regions: [
          { poly: OVER_R, level: 0, endLevel: 7 },
          { poly: OVER_R, level: 1, endLevel: 6 },
          { poly: CORN_R_F, level: 2, endLevel: 5 },
          { poly: CORN_R_F, level: 3, endLevel: 4 },
        ],
      },
    ],
  },

  // Step 7 (app id "step8"): fold the locked triangle in half backward down
  // the center line, producing the final unit (two points, two pockets).
  step8: {
    regions: [
      ...plies(TRI_R, 2, 3),
      ...plies(BODY_R_LOW, 0, 1),
      ...plies(wrapPoly(OVER_R), 6, 7),
      ...plies(wrapPoly(CORN_R_F), 4, 5),
    ],
    groups: [{
      hinge: { p: [CX, 0], d: [0, 1] }, dir: -1, window: [0, 1],
      regions: [
        { poly: TRI_L, level: 2, endLevel: -3 },
        { poly: TRI_L, level: 3, endLevel: -4 },
        { poly: BODY_L_LOW, level: 0, endLevel: -1 },
        { poly: BODY_L_LOW, level: 1, endLevel: -2 },
        { poly: wrapPoly(OVER_L), level: 6, endLevel: -7 },
        { poly: wrapPoly(OVER_L), level: 7, endLevel: -8 },
        { poly: wrapPoly(CORN_L_F), level: 4, endLevel: -5 },
        { poly: wrapPoly(CORN_L_F), level: 5, endLevel: -6 },
      ],
    }],
  },
};

// Step 6 wraps polygons across y = 1.
function wrapPoly(poly) {
  return poly.map(([x, y]) => [x, 2 - y]);
}

export const GV_STEP_IDS = Object.keys(STEPS);

export function getGVStepModel(stepId) {
  return STEPS[stepId] || STEPS.paper;
}

// --- Geometry math -----------------------------------------------------------

function reflect2D([x, y], { p, d }) {
  const vx = x - p[0];
  const vy = y - p[1];
  const dot = vx * d[0] + vy * d[1];
  return [p[0] + 2 * dot * d[0] - vx, p[1] + 2 * dot * d[1] - vy];
}

// Rotate point v (3D) about the axis through (p, z=0) with direction d (in-plane).
function rotateAboutHinge([x, y, z], { p, d }, theta) {
  const vx = x - p[0];
  const vy = y - p[1];
  const vz = z;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const dot = vx * d[0] + vy * d[1];
  // Rodrigues: v' = v cosθ + (u × v) sinθ + u (u·v)(1 − cosθ), u = (d[0], d[1], 0)
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

/**
 * Orients a polygon so its winding encodes which paper face points at the
 * viewer. In a flat-folded stack, adjacent layers alternate facing, so a
 * layer's facing is simply its level parity: even levels show the paper
 * front (CCW), odd levels show the back (CW).
 */
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

/**
 * Computes the folded model at progress t.
 * Returns { faces: [{ pts: [[x,y,z]...], moving: bool }], creases: [{a:[x,y,z], b:[x,y,z]}] }
 */
export function computeGVGeometry(stepId, t) {
  const model = getGVStepModel(stepId);
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

    // Pick the rotation direction that lifts the moving side toward
    // dir * +z early in the fold.
    const probe = [...centroid(group.regions[0].poly), 0];
    const lifted = rotateAboutHinge(probe, group.hinge, 0.3);
    const spin = (Math.sign(lifted[2]) === Math.sign(group.dir)) ? 1 : -1;

    for (const r of group.regions) {
      const pts = orientForLevel(r.poly, r.level).map(([x, y]) => {
        const start = [x, y, r.level * PLY];
        const rot = rotateAboutHinge(start, group.hinge, theta * spin);
        // Blend in a correction so the fold lands exactly on its target
        // layer (the rigid rotation alone would land at mirrored z).
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

  return { faces, creases, flip: !!model.flip };
}
