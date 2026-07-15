import { expect, test, describe } from "vitest";
import { parseGVLayout } from "./gv-importer.js";

const enc = (s) => Buffer.from(s, "utf-8").toString("base64");

describe("parseGVLayout", () => {
  test("parses palette, parts, rows and pieces", () => {
    const model = parseGVLayout(enc("V2a#0000FF-b#01b77a>Cup<Z:Aa2Ab3|X:Ab12"));
    expect(model).not.toBeNull();
    expect(model.colorPalette).toEqual({ a: "#0000FF", b: "#01b77a" });
    expect(model.parts).toHaveLength(1);
    expect(model.parts[0].name).toBe("Cup");
    const [row1, row2] = model.parts[0].rows;
    expect(row1.alignment).toBe("offset");
    expect(row1.pieces).toEqual([
      { type: "A", color: "#0000FF", count: 2 },
      { type: "A", color: "#01b77a", count: 3 },
    ]);
    expect(row2.alignment).toBe("straight");
    expect(row2.pieces[0].count).toBe(12);
  });

  test("handles the V2a header variant (palette key after the prefix)", () => {
    const model = parseGVLayout(enc("V2ay#FFD700-g#228B22>Body<Z:Ay12|Z:Ag8"));
    expect(model.colorPalette.y).toBe("#FFD700");
    expect(model.colorPalette.g).toBe("#228B22");
    expect(model.parts[0].rows[0].pieces[0].color).toBe("#FFD700");
  });

  test("splits multiple parts on both '>' and '~' separators", () => {
    const model = parseGVLayout(enc("V2e#FFFFFF>Body<Z:Ae6|Z:Ae8~Tail<Z:Ae2"));
    expect(model.parts.map((p) => p.name)).toEqual(["Body", "Tail"]);
  });

  test("skips corrupt bytes inside rows instead of failing", () => {
    const model = parseGVLayout(enc("V2e#FFFFFF>Body<Z:Ae3@!Ae2|Z:YM4Ae5"));
    const rows = model.parts[0].rows;
    expect(rows[0].pieces.map((p) => p.count)).toEqual([3, 2]);
    expect(rows[1].pieces.map((p) => p.count)).toEqual([5]);
  });

  test("unknown color keys fall back to white", () => {
    const model = parseGVLayout(enc("V2y#FFFFFF>Sphere<Z:Ae6"));
    expect(model.parts[0].rows[0].pieces[0].color).toBe("#ffffff");
  });

  test("rejects non-V2 payloads", () => {
    expect(parseGVLayout(enc("V1a#000000>X<Z:Aa2"))).toBeNull();
    expect(parseGVLayout(enc("garbage"))).toBeNull();
  });

  test("clamps an oversized per-piece count", () => {
    const model = parseGVLayout(enc("V2a#0000FF>Body<Z:Aa999999999"));
    expect(model.parts[0].rows[0].pieces[0].count).toBe(1000);
  });

  test("caps the total number of pieces across the model", () => {
    const model = parseGVLayout(enc("V2a#0000FF>Body<Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000|Z:Aa1000"));
    const total = model.parts
      .flatMap((p) => p.rows)
      .flatMap((r) => r.pieces)
      .reduce((s, p) => s + p.count, 0);
    expect(total).toBe(10000);
  });

  test("truncates an excessively long part name", () => {
    const longName = "x".repeat(500);
    const model = parseGVLayout(enc(`V2a#0000FF>${longName}<Z:Aa2`));
    expect(model.parts[0].name.length).toBe(200);
  });
});
