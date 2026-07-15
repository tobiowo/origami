import { expect, test, describe } from "vitest";
import * as THREE from "three";
import { GV_UNIT, createGVUnitGeometry } from "./gv-unit-mesh.js";

describe("GV_UNIT", () => {
  test("exposes positive base dimensions", () => {
    expect(GV_UNIT.WIDTH).toBeGreaterThan(0);
    expect(GV_UNIT.HEIGHT).toBeGreaterThan(0);
    expect(GV_UNIT.THICK).toBeGreaterThan(0);
  });
});

describe("createGVUnitGeometry", () => {
  test("builds a BufferGeometry with a position attribute", () => {
    const geo = createGVUnitGeometry(THREE);
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
    const pos = geo.getAttribute("position");
    expect(pos).toBeTruthy();
    expect(pos.itemSize).toBe(3);
  });

  test("emits 16 triangles (48 vertices) covering front, back, sides and pockets", () => {
    const geo = createGVUnitGeometry(THREE);
    const pos = geo.getAttribute("position");
    expect(pos.count).toBe(48);
    expect(pos.array).toHaveLength(144);
  });

  test("computes vertex normals", () => {
    const geo = createGVUnitGeometry(THREE);
    const normals = geo.getAttribute("normal");
    expect(normals).toBeTruthy();
    expect(normals.count).toBe(48);
  });

  test("keeps geometry within the unit's declared footprint", () => {
    const geo = createGVUnitGeometry(THREE);
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox;
    // Base is centered on x, sits on y=0 and rises to the apex height.
    expect(min.x).toBeCloseTo(-GV_UNIT.WIDTH / 2, 5);
    expect(max.x).toBeCloseTo(GV_UNIT.WIDTH / 2, 5);
    expect(min.y).toBeGreaterThanOrEqual(0);
    expect(max.y).toBeCloseTo(GV_UNIT.HEIGHT, 5);
    // Thickness straddles z=0 and never exceeds the base half-thickness.
    expect(Math.max(Math.abs(min.z), Math.abs(max.z))).toBeLessThanOrEqual(
      GV_UNIT.THICK / 2 + 1e-6,
    );
  });
});
