import { expect, test, describe } from "vitest";
import { computeKeelGeometry, PLY } from "./keel-fold-model.js";

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
  let ax = 0, ay = 0, az = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const u = pts[i].map((v, k) => v - pts[0][k]);
    const v = pts[i + 1].map((q, k) => q - pts[0][k]);
    ax += u[1] * v[2] - u[2] * v[1];
    ay += u[2] * v[0] - u[0] * v[2];
    az += u[0] * v[1] - u[1] * v[0];
  }
  return Math.sqrt(ax * ax + ay * ay + az * az) / 2;
}

const totalArea = (faces) => faces.reduce((s, f) => s + polyArea3D(f.pts), 0);

describe("paper conservation", () => {
  // The 3x1 sheet must be fully accounted for at every fold progress.
  test.each(["crease", "sleeve", "miter", "keel"])("%s preserves total paper area", (stepId) => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(totalArea(computeKeelGeometry(stepId, t).faces)).toBeCloseTo(3, 5);
    }
  });
});

describe("step end states", () => {
  test("crease step folds to the half sheet and back, leaving a crease mark", () => {
    const mid = bbox(computeKeelGeometry("crease", 0.5).faces);
    expect(mid.min[1]).toBeCloseTo(0.5);
    const end = bbox(computeKeelGeometry("crease", 1).faces);
    expect(end.min[1]).toBeCloseTo(0);
    expect(end.max[1]).toBeCloseTo(1);
    expect(computeKeelGeometry("crease", 1).creases.length).toBe(1);
    expect(computeKeelGeometry("crease", 0.5).creases.length).toBe(0);
  });

  test("sleeve fold produces the 3 x 0.5 strip", () => {
    const { min, max } = bbox(computeKeelGeometry("sleeve", 1).faces);
    expect(min[1]).toBeCloseTo(0.25);
    expect(max[1]).toBeCloseTo(0.75);
    expect(min[0]).toBeCloseTo(0);
    expect(max[0]).toBeCloseTo(3);
  });

  test("miter folds keep the silhouette inside the strip (tabs fold behind)", () => {
    const { min, max } = bbox(computeKeelGeometry("miter", 1).faces);
    expect(min[1]).toBeCloseTo(0.25);
    expect(max[1]).toBeCloseTo(0.75);
    expect(min[2]).toBeLessThan(0); // tabs are behind the strip
  });

  test("miter creases climb at 54° (pentagon variant)", () => {
    // The static band's slanted ends encode the miter: run/rise = 1/tan54°.
    const dx = 0.5 / Math.tan(54 * Math.PI / 180);
    const g = computeKeelGeometry("miter", 1);
    const band = g.faces[0].pts;
    const xs = band.map((p) => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(0);
    const topXs = band.filter((p) => Math.abs(p[1] - 0.75) < 1e-9).map((p) => p[0]);
    expect(Math.min(...topXs)).toBeCloseTo(dx, 5);
  });

  test("keel fold halves the strip", () => {
    const { min, max } = bbox(computeKeelGeometry("keel", 1).faces);
    expect(min[1]).toBeCloseTo(0.25);
    expect(max[1]).toBeCloseTo(0.5);
    expect(min[0]).toBeCloseTo(0);
    expect(max[0]).toBeCloseTo(3);
  });
});

describe("layer stacking", () => {
  test("finished unit's layers all sit on distinct levels", () => {
    const { faces } = computeKeelGeometry("keel", 1);
    // Group faces by identical footprint; overlapping layers must differ in z.
    const byZ = new Map();
    for (const f of faces) {
      const z = Math.round(f.pts[0][2] / PLY);
      const key = f.pts.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).sort().join(";");
      const list = byZ.get(key) || [];
      expect(list).not.toContain(z);
      list.push(z);
      byZ.set(key, list);
    }
  });

  test("finished unit stacks six layers near the tabs", () => {
    const { faces } = computeKeelGeometry("keel", 1);
    const zs = new Set(faces.map((f) => Math.round(f.pts[0][2] / PLY)));
    expect(zs.size).toBeGreaterThanOrEqual(6);
  });
});
