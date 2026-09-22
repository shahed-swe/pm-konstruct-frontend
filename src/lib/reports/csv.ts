/**
 * A table as a CSV, downloaded from the browser.
 *
 * The legacy exported to Excel through a library; this writes CSV, which
 * every spreadsheet opens and which cannot carry a formula the way a
 * generated workbook can. Recorded in `docs/audit/preserved-quirks.md`.
 */

/** Quotes a value the way a spreadsheet expects, and defuses formulas. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = String(value);

  // A cell starting with one of these is executed as a formula by Excel and
  // Sheets when the file is opened -- the classic CSV injection. Prefixing a
  // tab stops that without changing what a reader sees. These reports carry
  // free text typed by whoever was on site.
  const dangerous = /^[=+\-@\t\r]/.test(text);
  const escaped = text.replace(/"/g, '""');
  return `"${dangerous ? `\t${escaped}` : escaped}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join(
    "\r\n",
  );
}

/** Triggers the download. Client-only. */
export function downloadCsv(filename: string, csv: string): void {
  // The BOM is what makes Excel read it as UTF-8 rather than as the local
  // code page, which otherwise mangles every address with an accent in it.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
