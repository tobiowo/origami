import { expect, test, describe } from "vitest";
import { computeGVGeometry, getGVStepModel, PLY } from "./gv-fold-model.js";

function bbox(faces) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const f of faces) {
    for (const p of f.pts) {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p[i]);
        max[i] = Math.max(max[i], p[i]);
      }
    }
  }
  return { min, max };
}

function polyArea3D(pts) {
  // Sum of cross products (works for planar convex polygons)
  let ax = 0, ay = 0, az = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const ux = pts[i][0] - pts[0][0], uy = pts[i][1] - pts[0][1], uz = pts[i][2] - pts[0][2];
    const vx = pts[i + 1][0] - pts[0][0], vy = pts[i + 1][1] - pts[0][1], vz = pts[i + 1][2] - pts[0][2];
    ax += uy * vz - uz * vy;
    ay += uz * vx - ux * vz;
    az += ux * vy - uy * vx;
  }
  return Math.sqrt(ax * ax + ay * ay + az * az) / 2;
}

function totalArea(faces) {
  return faces.reduce((s, f) => s + polyArea3D(f.pts), 0);
}

const FOLD_STEPS = ["step1", "step2", "step3", "step5", "step6", "step8"];

describe("paper conservation", () => {
  // The full sheet is 1.5 x 1 = 1.5 of paper. Every step, at every fold
  // progress, must account for all of it.
  test.each(FOLD_STEPS)("%s preserves total paper area", (stepId) => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(totalArea(computeGVGeometry(stepId, t).faces)).toBeCloseTo(1.5, 5);
    }
  });

  test("flip step regions also account for the full sheet", () => {
    expect(totalArea(computeGVGeometry("step4", 0).faces)).toBeCloseTo(1.5, 5);
  });
});

describe("step end states", () => {
  test("step 1 folds the sheet into a 1.5 x 0.5 strip", () => {
    const { min, max } = bbox(computeGVGeometry("step1", 1).faces);
    expect(min[0]).toBeCloseTo(0);
    expect(max[0]).toBeCloseTo(1.5);
    expect(min[1]).toBeCloseTo(0.5);
    expect(max[1]).toBeCloseTo(1.0);
  });

  test("step 2 creases and returns to the flat strip", () => {
    const { min, max } = bbox(computeGVGeometry("step2", 1).faces);
    expect(min[0]).toBeCloseTo(0);
    expect(max[0]).toBeCloseTo(1.5);
    // ...and the crease mark is shown once the fold has been opened again
    expect(computeGVGeometry("step2", 1).creases.length).toBe(1);
    expect(computeGVGeometry("step2", 0.5).creases.length).toBe(0);
  });

  test("step 2 halfway is folded onto the left half", () => {
    const { min, max } = bbox(computeGVGeometry("step2", 0.5).faces);
    expect(max[0]).toBeCloseTo(0.75);
    expect(min[0]).toBeCloseTo(0);
  });

  test("step 3 makes the point with overhangs above the top edge", () => {
    const { min, max } = bbox(computeGVGeometry("step3", 1).faces);
    expect(min[0]).toBeCloseTo(0.25);
    expect(max[0]).toBeCloseTo(1.25);
    expect(min[1]).toBeCloseTo(0.5);  // the point at the bottom
    expect(max[1]).toBeCloseTo(1.25); // overhangs stick 0.25 above the strip
  });

  test("step 3 folds sequentially: left flap first, then right", () => {
    const { max } = bbox(computeGVGeometry("step3", 0.5).faces);
    // After the left fold, the right flap is still flat, reaching x = 1.5
    expect(max[0]).toBeCloseTo(1.5);
  });

  test("step 6 wraps the overhangs; nothing extends past the triangle", () => {
    const { min, max } = bbox(computeGVGeometry("step6", 1).faces);
    expect(min[1]).toBeCloseTo(0.5);
    expect(max[1]).toBeCloseTo(1.0); // overhangs are gone
    expect(min[0]).toBeCloseTo(0.25);
    expect(max[0]).toBeCloseTo(1.25);
  });

  test("step 6 corner folds end flush with the triangle edges", () => {
    const { faces } = computeGVGeometry("step6", 1);
    // The left wrapped flap's diagonal edge must lie on the triangle's left
    // edge: the line x + y = 1.25.
    const wrapped = faces.filter((f) => f.pts.every((p) => p[2] > 5 * PLY));
    expect(wrapped.length).toBeGreaterThan(0);
    const onLeftEdge = wrapped.some((f) =>
      f.pts.filter((p) => Math.abs(p[0] + p[1] - 1.25) < 1e-9).length >= 2);
    expect(onLeftEdge).toBe(true);
  });

  test("step 8 halves the unit into the final triangle", () => {
    const { min, max } = bbox(computeGVGeometry("step8", 1).faces);
    expect(min[0]).toBeCloseTo(0.75);
    expect(max[0]).toBeCloseTo(1.25);
    expect(min[1]).toBeCloseTo(0.5);
    expect(max[1]).toBeCloseTo(1.0);
  });
});

describe("layer stacking", () => {
  test("layers never collide: faces in the same xy spot sit on distinct z", () => {
    // Sample the completed unit at the centroid column of the final triangle.
    const { faces } = computeGVGeometry("step8", 1);
    const zs = faces.map((f) => f.pts[0][2]);
    const distinct = new Set(zs.map((z) => Math.round(z / PLY)));
    expect(distinct.size).toBe(zs.length);
  });

  test("the flip step is flagged for the view", () => {
    expect(computeGVGeometry("step4", 0).flip).toBe(true);
    expect(getGVStepModel("step4").flip).toBe(true);
    expect(computeGVGeometry("step3", 0).flip).toBe(false);
  });
});
