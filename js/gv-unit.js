/**
 * Golden Venture Unit crease pattern logic.
 * Fixed coordinate system to match user's description.
 * 
 * Coordinate System (Final Unit View):
 *   Apex E: (0.75, 0.5)
 *   Base line C-D: y = 1.0
 *   Flap area: y between 1.0 and 1.5
 */

const W = 1.5;
const H = 1.0;

function makeFold(vertices_coords, edges_vertices, edges_assignment, edges_foldAngle, faces_vertices) {
  return { 
    file_spec: 1.1, 
    vertices_coords, 
    edges_vertices, 
    edges_assignment, 
    edges_foldAngle, 
    faces_vertices: faces_vertices || [] 
  };
}

/**
 * Simplified stabilization: always fix the first face (the main triangle).
 */
export function findStableFace(fold) {
  return 0;
}

/**
 * Step 1: Lengthwise fold.
 * 
 * Before: 1.5 x 1.0 Rectangle
 * After: 1.5 x 0.5 Strip
 */
function buildGVHorizontalFold(percent) {
  const vc = [[0,0],[1.5,0],[0,0.5],[1.5,0.5],[0,1.0],[1.5,1.0]];
  const ev = [[0,1],[1,3],[3,5],[5,4],[4,2],[2,0],[2,3]];
  const ea = ["B","B","B","B","B","B","V"];
  const ef = [0,0,0,0,0,0, 180*percent];
  const fv = [[0,1,3,2],[2,3,5,4]];
  return makeFold(vc, ev, ea, ef, fv);
}

/**
 * Step 2: Center crease.
 */
function buildGVCenterCrease(percent) {
  const vc = [[0,0.5],[0.75,0.5],[1.5,0.5],[0,1.0],[0.75,1.0],[1.5,1.0]];
  const ev = [[0,1],[1,2],[2,5],[5,4],[4,3],[3,0],[1,4]];
  const ea = ["B","B","B","B","B","B","V"];
  const ef = [0,0,0,0,0,0, 180*percent];
  const fv = [[0,1,4,3],[1,2,5,4]];
  return makeFold(vc, ev, ea, ef, fv);
}

/**
 * Step 3: Make a Point.
 */
function buildGVDiagonals(percent) {
  const vc = [
    [0.75, 0.5], // 0: E (Apex)
    [0.25, 1.0], // 1: C
    [1.25, 1.0], // 2: D
    [0, 1.0],    // 3: F
    [0, 0.5],    // 4: BL
    [1.5, 1.0],  // 5: G
    [1.5, 0.5],  // 6: BR
  ];
  const ev = [
    [3,1],[1,2],[2,5],[5,6],[6,0],[0,4],[4,3], // boundary
    [0,1],[0,2]  // valley fold diagonals: E-C, E-D
  ];
  const ea = ["B","B","B","B","B","B","B","V","V"];
  const ef = [0,0,0,0,0,0,0, 180*percent, 180*percent];
  const fv = [[0,1,2],[0,4,3,1],[0,2,5,6]];
  return makeFold(vc, ev, ea, ef, fv);
}

/**
 * Step 5: Corner Folds.
 */
function buildGVCornerFolds(percent) {
  const vc = [
    [0.75, 0.5],  // 0: E
    [0.25, 1.0],  // 1: C
    [1.25, 1.0],  // 2: D
    [0, 1.0],     // 3: F
    [0, 0.5],     // 4: BL
    [1.5, 1.0],   // 5: G
    [1.5, 0.5],   // 6: BR
    [0, 0.75],    // 7: Left wing crease start
    [1.5, 0.75],  // 8: Right wing crease start
  ];
  const ev = [
    [1,2], [2,5],[5,8],[8,6],[6,0],[0,4],[4,7],[7,3],[3,1], // boundary
    [0,1],[0,2], // Step 3 creases
    [1,7],[2,8]  // Step 5 creases
  ];
  const ea = ["B","B","B","B","B","B","B","B","B","V","V","V","V"];
  const ef = [0,0,0,0,0,0,0,0,0, 180, 180, 180*percent, 180*percent];
  // Counter-clockwise faces
  const fv = [
    [0,2,1],       // Center Triangle E-D-C
    [0,1,7,4],     // Inner Left E-C-P-BL
    [1,3,7],       // Left Corner C-F-P
    [0,6,8,2],     // Inner Right E-BR-Q-D
    [2,8,5]        // Right Corner D-Q-G
  ];
  
  return makeFold(vc, ev, ea, ef, fv);
}

/**
 * Step 6: Lock Flaps.
 */
function buildGVFlap(percent) {
  const vc = [
    [0.75, 0.5],  // 0: E
    [0.25, 1.0],  // 1: C
    [1.25, 1.0],  // 2: D
    [0, 0.75],    // 3: P
    [1.5, 0.75],  // 4: Q
    [0, 0.5],     // 5: BL
    [1.5, 0.5],   // 6: BR
  ];
  const ev = [
    [1,2], [2,4],[4,6],[6,0],[0,5],[5,3],[3,1], // boundary
    [0,1],[0,2] // Step 6 creases (animated from 180 to 0)
  ];
  // Counter-clockwise faces
  const fv = [
    [0,2,1],       // Center Triangle E-D-C
    [0,1,3,5],     // Left Wing E-C-P-BL
    [0,6,4,2]      // Right Wing E-BR-Q-D
  ];
  const ea = ["B","B","B","B","B","B","B","V","V"];
  // We fold from 180 (back) to 0 (front)
  const ef = [0,0,0,0,0,0,0, 180 - 180*percent, 180 - 180*percent];
  return makeFold(vc, ev, ea, ef, fv);
}

/**
 * Step 8: Final center fold.
 */
function buildGVCenterFold(percent) {
  const vc = [
    [0.75, 0.5], // 0: E (Apex)
    [0.25, 1.0], // 1: C
    [1.25, 1.0], // 2: D
    [0.75, 1.0], // 3: M (Middle of base)
  ];
  const ev = [
    [0,1],[1,3],[3,2],[2,0], // boundary
    [0,3] // vertical center crease
  ];
  const ea = ["B","B","B","B","V"];
  const ef = [0,0,0,0, 180*percent];
  const fv = [[0,1,3],[0,3,2]];
  return makeFold(vc, ev, ea, ef, fv);
}

export function createGVFOLD() {
  return {
    file_spec: 1.1,
    file_title: "Golden Venture Unit Base",
    vertices_coords: [[0, 0], [W, 0], [W, H], [0, H]],
    edges_vertices: [[0, 1], [1, 2], [2, 3], [3, 0]],
    edges_assignment: ["B", "B", "B", "B"],
    edges_foldAngle: [0, 0, 0, 0],
    faces_vertices: [[0, 1, 2, 3]],
  };
}

export function getGVForStep(stepName, percent = 1) {
  if (stepName === 'step1') return buildGVHorizontalFold(percent);
  if (stepName === 'step2') return buildGVCenterCrease(percent);
  if (stepName === 'step3') return buildGVDiagonals(percent);
  if (stepName === 'step5') return buildGVCornerFolds(percent);
  if (stepName === 'step6') return buildGVFlap(percent);
  if (stepName === 'step8') return buildGVCenterFold(percent);
  return createGVFOLD();
}
