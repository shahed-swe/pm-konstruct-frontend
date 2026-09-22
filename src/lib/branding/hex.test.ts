/**
 * The colour conversion, diffed against the original.
 *
 * `tools/phase16/legacy-hex-to-hsl.mjs` holds the running application's
 * function verbatim, and `gen-hex-fixture.mjs` runs it over every greyscale
 * value, the colours the product ships and a spread through the RGB cube.
 * If this port ever rounds a hue differently, the diff names the colour.
 *
 * Worth the trouble because the failure is silent: a slightly wrong orange
 * looks fine in isolation and wrong only beside the old screenshots the
 * client signed off.
 */
import { describe, expect, it } from "vitest";
import fixture from "../../../../tools/phase16/hex-fixture.json";
import { hexToHsl, isHex6 } from "./hex";

describe("hexToHsl", () => {
  it("agrees with the legacy on every fixture case", () => {
    const mismatches = fixture
      .map(({ input, expected }) => ({ input, expected, actual: hexToHsl(input) }))
      .filter((c) => c.actual !== c.expected);

    expect(mismatches).toEqual([]);
  });

  it("covers the cases worth covering", () => {
    // Guards the guard: an empty or truncated fixture would make the test
    // above pass while checking nothing.
    expect(fixture.length).toBeGreaterThan(500);
    expect(fixture.some((c) => c.input === "#E84E1B")).toBe(true);
    expect(fixture.some((c) => c.input === "#0f1117")).toBe(true);
  });

  it("leaves greyscale with no hue", () => {
    expect(hexToHsl("#808080")).toBe("0 0% 50%");
  });
});

describe("isHex6", () => {
  it("accepts six digits in either case", () => {
    expect(isHex6("#E84E1B")).toBe(true);
    expect(isHex6("#e84e1b")).toBe(true);
  });

  it("rejects anything a stylesheet should not be given", () => {
    for (const bad of [
      "#abc",
      "E84E1B",
      "#E84E1BB",
      "red",
      // The reason the check exists at all: without it these reach
      // `style.setProperty` and become a CSS injection.
      "#000;} body{display:none",
      "var(--x)",
      "",
    ]) {
      expect(isHex6(bad), bad).toBe(false);
    }
  });
});
