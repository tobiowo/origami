import { expect, test, beforeAll, describe } from "vitest";
import { createSonobeAnimationSequence } from "./sonobe-animation.js";
import ear from "./lib/rabbit-ear.js";

beforeAll(() => {
  // sonobe.js reads the origami engine from window.ear
  global.window = { ear };
  global.ear = ear;
});

describe("createSonobeAnimationSequence", () => {
  test("returns the flat pattern followed by the four folding steps", () => {
    const seq = createSonobeAnimationSequence(ear);
    expect(seq).toHaveLength(5);
    expect(seq.map((f) => f.frame_title)).toEqual([
      "Flat Crease Pattern",
      "Step 1: Edges to Center",
      "Step 2: Diagonal Folds",
      "Step 3: Fold in Half",
      "Step 4: Completed Unit",
    ]);
  });

  test("every frame is a well-formed FOLD graph", () => {
    const seq = createSonobeAnimationSequence(ear);
    for (const fold of seq) {
      expect(Array.isArray(fold.vertices_coords)).toBe(true);
      expect(fold.vertices_coords.length).toBeGreaterThan(0);
      expect(Array.isArray(fold.edges_vertices)).toBe(true);
      expect(fold.edges_vertices.length).toBe(fold.edges_assignment.length);
      // Each edge references two valid vertex indices.
      for (const [a, b] of fold.edges_vertices) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(fold.vertices_coords.length);
        expect(b).toBeLessThan(fold.vertices_coords.length);
      }
    }
  });

  test("the first frame is the unfolded sheet (all fold angles zero)", () => {
    const [flat] = createSonobeAnimationSequence(ear);
    expect(flat.edges_foldAngle.every((a) => a === 0)).toBe(true);
  });

  test("later folding frames introduce non-zero fold angles", () => {
    const seq = createSonobeAnimationSequence(ear);
    for (const fold of seq.slice(1)) {
      expect(fold.edges_foldAngle.some((a) => a !== 0)).toBe(true);
    }
  });
});
