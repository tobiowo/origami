import { expect, test, beforeAll } from "vitest";
import { getGVForStep, createGVFOLD } from "./gv-unit.js";
import ear from "../references/rabbit-ear/src/index.js";

beforeAll(() => {
  global.window = { ear };
  global.ear = ear;
});

test("GV Crease Pattern Base", () => {
  const fold = createGVFOLD();
  expect(fold.faces_vertices.length).toBe(1);
});

test("Step 1: Vertical Fold", () => {
  const fold = getGVForStep('step1', 1.0);
  expect(fold.edges_assignment.includes('V')).toBe(true);
});

test("Step 3: Point at Bottom Geometry", () => {
  const fold = getGVForStep('step3', 1.0);
  // House folds (22, 23) should be 'V'
  expect(fold.edges_assignment[22]).toBe('V');
  expect(fold.edges_foldAngle[22]).toBe(180);
});

test("Step 5: Corner Folds", () => {
  const fold = getGVForStep('step5', 1.0);
  // Corner folds (26, 27) should be 'V'
  expect(fold.edges_assignment[26]).toBe('V');
  expect(fold.edges_foldAngle[26]).toBe(180);
});

test("Step 8: Final Fold", () => {
  const fold = getGVForStep('step8', 1.0);
  // Vertical center fold (12-15)
  expect(fold.edges_assignment[12]).toBe('V');
  expect(fold.edges_foldAngle[12]).toBe(180);
});
