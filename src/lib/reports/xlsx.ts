"use client";

/**
 * A table as an Excel workbook, the way the current app exports them.
 *
 * ExcelJS is heavy -- about half a megabyte -- so it is imported only when
 * somebody actually presses the button. Everything here is client-only for
 * that reason.
 */

export interface SheetColumn {
  header: string;
  width?: number;
}

/**
 * Anything starting `=`, `+`, `-` or `@` is run as a formula when the file
 * is opened. These sheets carry free text typed by whoever was on site, so
 * the prefix is not optional.
 */
function safeCell(value: unknown): unknown {
  if (typeof value !== "string") return value ?? "";
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export async function downloadXlsx(
  filename: string,
  sheetName: string,
  columns: SheetColumn[],
  rows: unknown[][],
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PM Konstruct";
  workbook.created = new Date();

  // Excel refuses a sheet name over 31 characters, or one containing any of
  // : \ / ? * [ ] -- and a job address contains slashes often enough.
  const sheet = workbook.addWorksheet(sheetName.replace(/[:\\/?*[\]]/g, " ").slice(0, 31));

  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: column.width ?? Math.max(12, Math.min(40, column.header.length + 6)),
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  // Frozen so the headings stay put while somebody scrolls a long report.
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow(row.map(safeCell));
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: Math.max(1, columns.length) },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
