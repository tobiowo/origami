/**
 * Per-step FOLD patterns for the Sonobe unit tutorial.
 *
 * Each step uses a minimal mesh with just the creases that step animates.
 * Keep these meshes coarse: a dense triangulated grid destabilizes the
 * origami-simulator GPU solver (positions saturate and nothing renders).
 *
 * Flat folds stop at FLAT (177°) instead of 180° so stacked layers never
 * become exactly coplanar (which z-fights badly).
 */

export const FLAT = 177;
const V_ANGLE = 150;  // the center fold of the finished unit's V
const TAB_ANGLE = -120;

/**
 * Build a simple square sheet FOLD object (no internal creases).
 */
export function buildGrid(percent = 1) {
  const vertices_coords = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const edges_vertices = [[0, 1], [1, 2], [2, 3], [3, 0]];
  const edges_assignment = ["B", "B", "B", "B"];
  const edges_foldAngle = [0, 0, 0, 0];
  const faces_vertices = [[0, 1, 2, 3]];

  return {
    file_spec: 1.1,
    file_title: "Sonobe Unit Base",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices,
  };
}

function withPlanarFaces(fold) {
  const ear = window.ear;
  if (ear && ear.graph && ear.graph.makePlanarFaces) {
    const res = ear.graph.makePlanarFaces({
      vertices_coords: fold.vertices_coords,
      edges_vertices: fold.edges_vertices,
    });
    fold.faces_vertices = res.faces_vertices;
  }
  return fold;
}

/**
 * Step 1: cupboard fold — top and bottom edges to the center line.
 */
function buildCupboardFold(percent = 1) {
  const vertices_coords = [
    [0, 0], [1, 0],
    [0, 0.25], [1, 0.25],
    [0, 0.75], [1, 0.75],
    [0, 1], [1, 1],
  ];
  const edges_vertices = [
    [0, 1], [6, 7],                 // outer edges
    [0, 2], [2, 4], [4, 6],         // left side
    [1, 3], [3, 5], [5, 7],         // right side
    [2, 3], [4, 5],                 // the two creases
  ];
  const edges_assignment = ["B", "B", "B", "B", "B", "B", "B", "B", "V", "V"];
  const edges_foldAngle = [0, 0, 0, 0, 0, 0, 0, 0, FLAT * percent, FLAT * percent];

  return withPlanarFaces({
    file_spec: 1.1,
    file_title: "Sonobe Unit — Edges to Center",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices: [],
  });
}

/**
 * Step 2: the strip with the two Sonobe diagonal creases.
 */
function buildStripWithDiagonals(percent = 1) {
  const L = 0, C = 0.5, R = 1.0;
  const B = 0.25, T = 0.75;

  const vertices_coords = [
    [L, B], [C, B], [R, B],
    [L, T], [C, T], [R, T],
  ];

  const edges_vertices = [
    [0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [2, 5],
    [3, 1], [4, 2], [1, 4]
  ];

  const edges_assignment = ["B", "B", "B", "B", "B", "B", "M", "M", "F"];
  const edges_foldAngle = [0, 0, 0, 0, 0, 0, -FLAT * percent, -FLAT * percent, 0];

  return withPlanarFaces({
    file_spec: 1.1,
    file_title: "Sonobe Unit — Diagonal Folds",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices: [],
  });
}

/**
 * Step 3: the parallelogram folding into the unit's V along the center.
 * Stops at V_ANGLE — the finished unit is a 3D V, not folded flat.
 */
function buildParallelogramFold(percent = 1) {
  const topL = [0, 0.75], topR = [0.5, 0.75];
  const botL = [0.5, 0.25], botR = [1.0, 0.25];

  const vertices_coords = [botL, topR, topL, botR];
  const edges_vertices = [[0, 1], [1, 2], [2, 0], [0, 3], [3, 1]];
  const edges_assignment = ["V", "B", "B", "B", "B"];
  const edges_foldAngle = [V_ANGLE * percent, 0, 0, 0, 0];

  return withPlanarFaces({
    file_spec: 1.1,
    file_title: "Sonobe Unit — Fold into the V",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices: [],
  });
}

/**
 * Step 4: the V (already in place from step 3) plus the tab folds.
 * `percent` animates only the tabs; the center fold stays at V_ANGLE.
 */
function buildTabFold(percent = 1) {
  const ear = window.ear;
  const m = ear ? ear.math : null;
  const topL = [0, 0.75], topR = [0.5, 0.75];
  const botL = [0.5, 0.25], botR = [1.0, 0.25];

  const vertices_coords = [
    botL, topR, topL, botR,
    m ? m.lerp(topL, botL, 0.5) : [0.25, 0.5],
    m ? m.lerp(topR, botR, 0.5) : [0.75, 0.5],
  ];

  const edges_vertices = [[0, 1], [1, 4], [0, 5], [2, 4], [4, 0], [3, 5], [5, 1], [1, 2], [0, 3]];
  const edges_assignment = ["V", "M", "M", "B", "B", "B", "B", "B", "B"];
  const edges_foldAngle = [V_ANGLE, TAB_ANGLE * percent, TAB_ANGLE * percent, 0, 0, 0, 0, 0, 0];

  return withPlanarFaces({
    file_spec: 1.1,
    file_title: "Sonobe Unit — Tab Folds",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices: [],
  });
}

export function getSonobeForStep(stepName, percent = 1) {
  let fold;
  if (stepName === 'step1') fold = buildCupboardFold(percent);
  else if (stepName === 'step2') fold = buildStripWithDiagonals(percent);
  else if (stepName === 'step3') fold = buildParallelogramFold(percent);
  else if (stepName === 'step4') fold = buildTabFold(percent);
  else fold = buildGrid();

  const ear = window.ear;
  if (ear && ear.graph && ear.graph.clean) {
    ear.graph.clean(fold);
  }
  return fold;
}

export function createSonobeFOLD() {
  const fold = buildGrid();
  const ear = window.ear;
  if (ear && ear.graph && ear.graph.clean) {
    ear.graph.clean(fold);
  }
  return fold;
}
