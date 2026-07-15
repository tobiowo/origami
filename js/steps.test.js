import { expect, test, describe } from "vitest";
import { steps } from "./steps.js";

describe("sonobe steps data", () => {
  test("opens with the folding overview animation", () => {
    expect(steps[0].renderer).toBe("animation");
    expect(steps[0].title).toMatch(/overview/i);
  });

  test("every step has a title, description and known renderer", () => {
    for (const step of steps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
      expect(["animation", "simulator"]).toContain(step.renderer);
    }
  });

  test("simulator steps declare a fold percent or an enabled slider", () => {
    const sim = steps.filter((s) => s.renderer === "simulator");
    expect(sim.length).toBeGreaterThan(0);
    for (const step of sim) {
      const hasFixedPercent = typeof step.foldPercent === "number";
      expect(hasFixedPercent || step.sliderEnabled === true).toBe(true);
    }
  });

  test("interactive folding steps reference a valid step function", () => {
    const interactive = steps.filter((s) => s.sliderEnabled);
    expect(interactive.length).toBeGreaterThan(0);
    for (const step of interactive) {
      expect(step.stepFunc).toMatch(/^step\d+$/);
    }
  });

  test("titles are unique", () => {
    const titles = steps.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
