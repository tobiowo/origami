/**
 * Sonobe crease pattern on a 4x4 grid (5x5 vertices).
 */

// Vertex index from grid coordinates
export const V = (x, y) => y * 5 + x;

// Cells where the Sonobe diagonal goes top-left to bottom-right
const FLIPPED_CELLS = new Set(["0,2", "1,1", "2,2", "3,1"]);

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

/**
 * Build the base 4x4 triangulated grid FOLD object for folding steps.
 */
function buildFullGrid() {
  const vertices_coords = [];
  for (let y = 0; y <= 4; y++) {
    for (let x = 0; x <= 4; x++) {
      vertices_coords.push([x * 0.25, y * 0.25]);
    }
  }

  const edges_vertices = [];
  const edges_assignment = [];
  const edges_foldAngle = [];

  // Horizontal edges
  for (let y = 0; y <= 4; y++) {
    for (let x = 0; x < 4; x++) {
      edges_vertices.push([V(x, y), V(x + 1, y)]);
      edges_assignment.push(y === 0 || y === 4 ? "B" : "F");
      edges_foldAngle.push(0);
    }
  }
  // Vertical edges
  for (let x = 0; x <= 4; x++) {
    for (let y = 0; y < 4; y++) {
      edges_vertices.push([V(x, y), V(x, y + 1)]);
      edges_assignment.push(x === 0 || x === 4 ? "B" : "F");
      edges_foldAngle.push(0);
    }
  }
  // Diagonal edges
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if (FLIPPED_CELLS.has(`${x},${y}`)) {
        edges_vertices.push([V(x, y + 1), V(x + 1, y)]);
      } else {
        edges_vertices.push([V(x, y), V(x + 1, y + 1)]);
      }
      edges_assignment.push("F");
      edges_foldAngle.push(0);
    }
  }

  const ear = window.ear;
  let faces_vertices = [];
  if (ear && ear.graph && ear.graph.makePlanarFaces) {
    const res = ear.graph.makePlanarFaces({ vertices_coords, edges_vertices });
    faces_vertices = res.faces_vertices;
  }

  return {
    file_spec: 1.1,
    file_title: "Sonobe Full Grid",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices,
  };
}

/**
 * Build a simple strip mesh with just the two Sonobe diagonal creases.
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
  const edges_foldAngle = [0, 0, 0, 0, 0, 0, -180 * percent, -180 * percent, 0];

  const ear = window.ear;
  let faces_vertices = [];
  if (ear && ear.graph && ear.graph.makePlanarFaces) {
    const res = ear.graph.makePlanarFaces({ vertices_coords, edges_vertices });
    faces_vertices = res.faces_vertices;
  }

  return {
    file_spec: 1.1,
    file_title: "Sonobe Unit — Diagonal Folds",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices,
  };
}

/**
 * Build the parallelogram (result of step 2) with a center valley fold.
 */
function buildParallelogramFold(percent = 1) {
  const topL = [0, 0.75], topR = [0.5, 0.75];
  const botL = [0.5, 0.25], botR = [1.0, 0.25];
  
  const vertices_coords = [botL, topR, topL, botR];
  const edges_vertices = [[0, 1], [1, 2], [2, 0], [0, 3], [3, 1]];
  const edges_assignment = ["V", "B", "B", "B", "B"];
  const edges_foldAngle = [180 * percent, 0, 0, 0, 0];

  const ear = window.ear;
  let faces_vertices = [];
  if (ear && ear.graph && ear.graph.makePlanarFaces) {
    const res = ear.graph.makePlanarFaces({ vertices_coords, edges_vertices });
    faces_vertices = res.faces_vertices;
  }

  return {
    file_spec: 1.1,
    file_title: "Sonobe Unit — Fold in Half",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices,
  };
}

/**
 * Build the parallelogram with center fold + tab fold lines.
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
  const edges_foldAngle = [150 * percent, -120 * percent, -120 * percent, 0, 0, 0, 0, 0, 0];

  let faces_vertices = [];
  if (ear && ear.graph && ear.graph.makePlanarFaces) {
    const res = ear.graph.makePlanarFaces({ vertices_coords, edges_vertices });
    faces_vertices = res.faces_vertices;
  }

  return {
    file_spec: 1.1,
    file_title: "Sonobe Unit — Tab Folds",
    frame_classes: ["creasePattern"],
    frame_attributes: ["2D"],
    vertices_coords,
    edges_vertices,
    edges_assignment,
    edges_foldAngle,
    faces_vertices,
  };
}

export function findEdge(fold, v1, v2) {
  return fold.edges_vertices.findIndex(e =>
    (e[0] === v1 && e[1] === v2) || (e[0] === v2 && e[1] === v1)
  );
}

export function setCrease(fold, v1, v2, angle, assignment) {
  const idx = findEdge(fold, v1, v2);
  if (idx !== -1) {
    fold.edges_foldAngle[idx] = angle;
    fold.edges_assignment[idx] = assignment;
  }
}

export const H1 = [[V(0,1),V(1,1)], [V(1,1),V(2,1)], [V(2,1),V(3,1)], [V(3,1),V(4,1)]];
export const H3 = [[V(0,3),V(1,3)], [V(1,3),V(2,3)], [V(2,3),V(3,3)], [V(3,3),V(4,3)]];
export const FLAT = 180;

export function getSonobeForStep(stepName, percent = 1) {
  let fold = (stepName === 'step1') ? buildFullGrid() : buildGrid();
  if (stepName === 'step1') {
    H1.forEach(([a, b]) => setCrease(fold, a, b, FLAT * percent, "V"));
    H3.forEach(([a, b]) => setCrease(fold, a, b, FLAT * percent, "V"));
  }
  else if (stepName === 'step2') {
    fold = buildStripWithDiagonals(percent);
  }
  else if (stepName === 'step3') {
    fold = buildParallelogramFold(percent);
  }
  else if (stepName === 'step4') {
    fold = buildTabFold(percent);
  }

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
