import { expect, test, beforeAll } from "vitest";
import { getSonobeForStep, createSonobeFOLD } from "./sonobe.js";
import ear from "./lib/rabbit-ear.js";

beforeAll(() => {
  // Mock window.ear for the sonobe.js module
  global.window = { ear };
  global.ear = ear;
});

const getFoldedArea = (stepName) => {
  const foldData = getSonobeForStep(stepName);
  const graph = ear.graph(foldData);
  graph.populate();
  
  // Fold using the central face as root
  let rootFace = 0;
  if (graph.faces_vertices && graph.faces_vertices.length > 4) {
    rootFace = graph.faces_vertices.findIndex((_, i) => {
      const fv = graph.faces_vertices[i];
      const centers = fv.map(v => graph.vertices_coords[v]);
      const avgX = centers.reduce((a,b) => a + b[0], 0) / fv.length;
      const avgY = centers.reduce((a,b) => a + b[1], 0) / fv.length;
      return Math.abs(avgX - 0.5) < 0.2 && Math.abs(avgY - 0.5) < 0.2;
    });
    if (rootFace === -1) rootFace = 0;
  }

  // Pass rootFace as an array [rootFace]
  const folded = graph.folded([rootFace]);
  const box = folded.boundingBox();
  const area = box.span[0] * box.span[1];
  
  return area;
};

test("Crease Pattern Face Generation", () => {
  const fold = createSonobeFOLD();
  // Simple square sheet = 1 face
  expect(fold.faces_vertices.length).toBe(1);
});

test("Step 1: Edges to Center Footprint", () => {
  const area = getFoldedArea('step1');
  // 1x1 square folded to 1x0.5 strip
  expect(area).toBeCloseTo(0.5, 2);
});

test("Step 2: Diagonal Folds Footprint", () => {
  const area = getFoldedArea('step2');
  // 1x0.5 strip with corners folded behind.
  // Footprint area remains 0.5 (bounding box of the folded result)
  expect(area).toBeCloseTo(0.5, 2);
});

test("Step 3: V Fold Footprint", () => {
  const area = getFoldedArea('step3');
  // Parallelogram bent 150° along the center crease. The static half still
  // spans 0.5 x 0.5 and the lifted half stays inside that bounding box.
  expect(area).toBeCloseTo(0.25, 2);
});

test("Step 3 ends as a 3D V, not folded flat", () => {
  const fold = getSonobeForStep('step3', 1);
  const graph = ear.graph(fold);
  graph.populate();
  const folded = graph.folded([0]);
  const box = folded.boundingBox();
  expect(box.span[2]).toBeGreaterThan(0.1);
});

test("Step 4: Completed Unit Footprint", () => {
  const area = getFoldedArea('step4');
  // The folded 3D shape has a footprint area of ~0.186.
  expect(area).toBeCloseTo(0.186, 2);
});

test("Step 4 percent animates only the tabs; the V stays in place", () => {
  const start = getSonobeForStep('step4', 0);
  const angles = (f) => f.edges_foldAngle.filter(a => a !== 0);
  // At percent 0 the only non-zero angle is the center V fold.
  expect(angles(start)).toEqual([150]);
  const end = getSonobeForStep('step4', 1);
  expect(angles(end).sort((a, b) => a - b)).toEqual([-120, -120, 150]);
});

test("Step 1 uses a minimal mesh", () => {
  // The dense 4x4 grid destabilized the origami-simulator GPU solver
  // (positions saturated and the step rendered blank). Keep this mesh small.
  const fold = getSonobeForStep('step1', 1);
  expect(fold.vertices_coords.length).toBeLessThanOrEqual(8);
  expect(fold.edges_assignment.filter(a => a === 'V').length).toBe(2);
});

test("Flat folds stay just shy of 180° to avoid coplanar z-fighting", () => {
  for (const step of ['step1', 'step2']) {
    const fold = getSonobeForStep(step, 1);
    for (const a of fold.edges_foldAngle) {
      expect(Math.abs(a)).toBeLessThan(180);
    }
  }
});
