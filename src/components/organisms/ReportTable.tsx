"use client";

/**
 * A report's results, as a table that can be downloaded.
 *
 * Generic over the row so each report declares its columns once and gets the
 * empty state, the loading state, the row count and the CSV for free.
 */
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { EmptyState } from "@/components/molecules/EmptyState";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/molecules/Table";
import { downloadCsv, toCsv } from "@/lib/reports/csv";
import { downloadXlsx } from "@/lib/reports/xlsx";

export interface Column<Row> {
  header: string;
  /** What the cell shows. */
  cell: (row: Row) => ReactNode;
  /** What the CSV carries. Defaults to the cell when it is already a string. */
  value?: (row: Row) => unknown;
  className?: string;
}

export function ReportTable<Row>({
  rows,
  columns,
  isLoading,
  caption,
  filename,
  emptyTitle = "Nothing to report",
  emptyDescription,
  rowKey,
}: {
  rows: Row[] | undefined;
  columns: Column<Row>[];
  isLoading: boolean;
  caption: string;
  filename: string;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: Row, index: number) => string | number;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    );
  }

  if (rows === undefined || rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  /** The values a spreadsheet gets, which are not always what the cell shows. */
  const exportRows = () =>
    (rows ?? []).map((row) =>
      columns.map((c) => (c.value === undefined ? c.cell(row) : c.value(row))),
    );

  function downloadAsCsv() {
    downloadCsv(filename, toCsv(columns.map((c) => c.header), exportRows()));
  }

  async function downloadAsXlsx() {
    await downloadXlsx(
      filename,
      caption,
      columns.map((c) => ({ header: c.header })),
      exportRows(),
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => void downloadAsXlsx()}>
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={downloadAsCsv}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader className="bg-secondary/40">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column.header} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={rowKey(row, index)}>
                {columns.map((column) => (
                  <TableCell key={column.header} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
