"use client";

/**
 * A simple PDF, the way the current app produces them.
 *
 * jsPDF, imported on demand -- it is large and most sessions never export
 * anything.
 *
 * The letterhead is the company's: its sidebar colour as the band, its
 * primary as the rule beneath, its name and its logo. That is what the
 * current app produces, and these documents go to clients, so they have to
 * look like the builder sent them.
 *
 * The legacy built each export by hand and the three had drifted apart --
 * different margins, different fonts, the badge in a different place. This
 * is one layout they all share.
 */

import { api } from "@/lib/api/client";

export interface PdfMeta {
  label: string;
  value: string;
}

export interface PdfSection {
  heading: string;
  /** Free text, wrapped to the page. */
  body?: string;
  /** Or a table. */
  columns?: string[];
  rows?: string[][];
}

const MARGIN = 18;
const LINE = 5.5;
const HEADER_HEIGHT = 38;

export interface PdfBranding {
  companyName: string;
  primaryColor: string;
  sidebarColor: string;
  /** Same-origin path; fetched with the session cookie. */
  logoUrl: string | null;
}

function hexOr(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

/** Reads the logo as a data URL, or gives up quietly. */
async function logoDataUrl(url: string): Promise<{ data: string; format: "PNG" | "JPEG" } | null> {
  try {
    // Through the API client, so the session is handled the same way it is
    // everywhere else -- a logo fetched half an hour into a session hits the
    // same token expiry as anything else.
    const blob = await api.blob(url.replace(/^\/api/, ""));
    // SVG cannot go into a PDF directly, and converting it is a rabbit hole
    // for something the letterhead survives without.
    if (!blob.type.includes("png") && !blob.type.includes("jpeg")) return null;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { data, format: blob.type.includes("png") ? "PNG" : "JPEG" };
  } catch {
    // The company-name letterhead stands on its own.
    return null;
  }
}

export async function buildPdf(options: {
  title: string;
  subtitle?: string;
  meta?: PdfMeta[];
  sections: PdfSection[];
  filename: string;
  /** Drawn as the letterhead. Omitted for an unbranded export. */
  branding?: PdfBranding | undefined;
  /** A pill beside the title, e.g. "APPROVED". */
  badge?: { label: string; background: string; text: string } | undefined;
}): Promise<File> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usable = pageWidth - MARGIN * 2;
  let y = MARGIN;

  if (options.branding !== undefined) {
    const sidebar = hexOr(options.branding.sidebarColor, "#0F1117");
    const primary = hexOr(options.branding.primaryColor, "#E84E1B");

    doc.setFillColor(sidebar);
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, "F");
    doc.setFillColor(primary);
    doc.rect(0, HEADER_HEIGHT, pageWidth, 2.5, "F");

    doc.setTextColor("#FFFFFF");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(options.branding.companyName.trim() || "PM Konstruct", MARGIN, 16);

    if (options.subtitle !== undefined) {
      doc.setFontSize(11);
      doc.text(options.subtitle.toUpperCase(), MARGIN, 27);
    }

    if (options.branding.logoUrl !== null) {
      const logo = await logoDataUrl(options.branding.logoUrl);
      if (logo !== null) {
        // Placed in the band's top right, sized to fit rather than scaled to
        // a shape nobody chose.
        doc.addImage(logo.data, logo.format, pageWidth - MARGIN - 32, 7, 32, 24, undefined, "FAST");
      }
    }

    doc.setTextColor("#111827");
    y = HEADER_HEIGHT + 14;
  }

  /** Starts a new page before anything that would run off the bottom. */
  const room = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(options.branding === undefined ? 16 : 18);
  doc.text(options.title, MARGIN, y);

  if (options.badge !== undefined) {
    doc.setFillColor(options.badge.background);
    doc.roundedRect(pageWidth - MARGIN - 33, y - 8, 33, 10, 2, 2, "F");
    doc.setTextColor(options.badge.text);
    doc.setFontSize(9);
    doc.text(options.badge.label, pageWidth - MARGIN - 16.5, y - 1.5, { align: "center" });
    doc.setTextColor("#111827");
  }

  y += 8;

  if (options.subtitle !== undefined && options.branding === undefined) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(options.subtitle, MARGIN, y);
    doc.setTextColor(0);
    y += 7;
  }

  for (const item of options.meta ?? []) {
    room(LINE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${item.label}:`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(item.value, MARGIN + 32, y);
    y += LINE;
  }

  y += 3;

  for (const section of options.sections) {
    room(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(section.heading, MARGIN, y);
    y += 6;

    if (section.body !== undefined && section.body !== "") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const line of doc.splitTextToSize(section.body, usable) as string[]) {
        room(LINE);
        doc.text(line, MARGIN, y);
        y += LINE;
      }
      y += 2;
    }

    if (section.columns !== undefined && section.rows !== undefined) {
      const widths = section.columns.map(() => usable / section.columns!.length);

      room(LINE + 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      section.columns.forEach((header, index) => {
        doc.text(header, MARGIN + widths.slice(0, index).reduce((a, b) => a + b, 0), y);
      });
      y += LINE;
      doc.setDrawColor(200);
      doc.line(MARGIN, y - 3.5, pageWidth - MARGIN, y - 3.5);

      doc.setFont("helvetica", "normal");
      for (const row of section.rows) {
        // Each cell wraps; the row is as tall as its tallest cell.
        const wrapped = row.map(
          (cell, index) => doc.splitTextToSize(cell, widths[index] ?? usable - 2) as string[],
        );
        const height = Math.max(...wrapped.map((lines) => lines.length)) * (LINE - 1);
        room(height + 1);
        wrapped.forEach((lines, index) => {
          doc.text(lines, MARGIN + widths.slice(0, index).reduce((a, b) => a + b, 0), y);
        });
        y += height + 1;
      }
      y += 3;
    }
  }

  const blob = doc.output("blob") as Blob;
  const name = options.filename.endsWith(".pdf") ? options.filename : `${options.filename}.pdf`;
  return new File([blob], name, { type: "application/pdf" });
}

/**
 * Hands the file to the system share sheet, falling back to a download.
 *
 * On a phone a supervisor wants to send it straight to the client from
 * WhatsApp; on a desktop there is no share sheet and a download is what they
 * expect. `canShare` has to be checked with the file, because several
 * browsers advertise `share` but refuse files.
 */
export async function shareOrDownload(file: File): Promise<void> {
  const canShareFiles =
    typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  if (typeof navigator.share === "function" && canShareFiles) {
    try {
      await navigator.share({ files: [file], title: file.name.replace(/\.pdf$/i, "") });
      return;
    } catch {
      // Dismissed, or refused. Fall through to the download rather than
      // leaving the user with nothing.
    }
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
