import { describe, expect, it } from "vitest";
import { brandingCss } from "./css";

describe("brandingCss", () => {
  it("writes the primary and the focus ring together", () => {
    // The legacy set `--ring` from the primary too. A blue site with an
    // orange focus ring reads as a bug.
    const css = brandingCss({ primaryColor: "#E84E1B", sidebarColor: "#0f1117" });
    expect(css).toContain("--primary: 15 82% 51%;");
    expect(css).toContain("--ring: 15 82% 51%;");
    expect(css).toContain("--sidebar: 225 21% 7%;");
  });

  it("emits nothing when there is nothing to override", () => {
    // So the layout can skip the <style> element rather than ship an empty one.
    expect(brandingCss({ primaryColor: "nonsense", sidebarColor: "" })).toBe("");
  });

  it("refuses a value that is not a colour", () => {
    // This string is rendered into the document unescaped. It must never be
    // possible for a stored value to close the rule and open another.
    const css = brandingCss({
      primaryColor: "#000;} body{display:none",
      sidebarColor: "#0f1117",
    });
    expect(css).not.toContain("display:none");
    expect(css).toBe(":root{--sidebar: 225 21% 7%;}");
  });
});
