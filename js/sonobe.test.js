import { expect, test, beforeAll } from "vitest";
import { getSonobeForStep, createSonobeFOLD } from "./sonobe.js";
import ear from "../references/rabbit-ear/src/index.js";

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

test("Step 3: Fold in Half Footprint", () => {
  const area = getFoldedArea('step3');
  // Parallelogram (area 0.25) folded in half vertically.
  // Footprint is now a square 0.5x0.5, area 0.25.
  expect(area).toBeCloseTo(0.25, 2);
});

test("Step 4: Completed Unit Footprint", () => {
  const area = getFoldedArea('step4');
  // The folded 3D shape has a footprint area of ~0.186.
  expect(area).toBeCloseTo(0.186, 2);
});
