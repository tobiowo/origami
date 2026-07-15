import { expect, test, describe } from "vitest";
import { steps } from "./gv-steps.js";
import { parseGVLayout } from "./gv-importer.js";

describe("gv-steps data", () => {
  test("every step has a title and a description", () => {
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(typeof step.title).toBe("string");
      expect(step.title.length).toBeGreaterThan(0);
      expect(typeof step.description).toBe("string");
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  test("folding steps expose a stepFunc and slider flag", () => {
    const folding = steps.filter((s) => s.stepFunc && s.renderer !== "assembly");
    expect(folding.length).toBeGreaterThan(0);
    for (const step of folding) {
      expect(step.stepFunc).toMatch(/^step\d+$/);
      expect(typeof step.sliderEnabled).toBe("boolean");
    }
  });

  test("assembly steps are either a plain ring or an importable layout", () => {
    const assembly = steps.filter((s) => s.renderer === "assembly");
    expect(assembly.length).toBeGreaterThan(0);
    for (const step of assembly) {
      if (step.layout === undefined) {
        expect(step.ringCount).toBeGreaterThan(0);
        expect(step.rows).toBeGreaterThan(0);
      } else {
        expect(typeof step.layout).toBe("string");
      }
    }
  });

  test("every bundled example layout parses into a non-empty model", () => {
    const layouts = steps.filter((s) => typeof s.layout === "string");
    expect(layouts.length).toBeGreaterThan(0);
    for (const step of layouts) {
      const model = parseGVLayout(step.layout);
      expect(model, `layout for "${step.title}" should parse`).not.toBeNull();
      expect(model.parts.length).toBeGreaterThan(0);
      for (const part of model.parts) {
        expect(part.rows.length).toBeGreaterThan(0);
        for (const row of part.rows) {
          expect(row.pieces.length).toBeGreaterThan(0);
          for (const piece of row.pieces) {
            expect(piece.count).toBeGreaterThan(0);
            expect(piece.color).toMatch(/^#[0-9a-fA-F]{6}$/);
          }
        }
      }
    }
  });
});
