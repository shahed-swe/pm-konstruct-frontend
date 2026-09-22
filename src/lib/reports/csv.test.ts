import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("quotes everything, so a comma in an address is safe", () => {
    expect(csvCell("12 Rae St, Fitzroy")).toBe('"12 Rae St, Fitzroy"');
  });

  it("doubles an embedded quote", () => {
    expect(csvCell('He said "no"')).toBe('"He said ""no"""');
  });

  it("renders null and undefined as empty", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("defuses a value a spreadsheet would run as a formula", () => {
    // Without the tab, opening the file executes this. These reports carry
    // free text typed by whoever was on site.
    for (const attack of ["=1+1", "+1", "-1", "@SUM(A1)"]) {
      expect(csvCell(attack)).toBe(`"\t${attack}"`);
    }
  });

  it("leaves an ordinary number alone", () => {
    expect(csvCell(42)).toBe('"42"');
  });
});

describe("toCsv", () => {
  it("writes the header and the rows, CRLF separated", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe('"a","b"\r\n"1","2"');
  });

  it("handles an empty table", () => {
    expect(toCsv(["a"], [])).toBe('"a"');
  });
});
