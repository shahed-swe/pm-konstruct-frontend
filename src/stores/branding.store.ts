/**
 * The company's branding, as the rest of the UI reads it.
 *
 * Held in a store rather than fetched per component because the sidebar, the
 * header, every email dialog and the job list all want the same three
 * fields, and because `jobDisplayMode` decides how a job is *labelled*
 * everywhere it appears -- by number, by name or by address. Getting that
 * from a query in each of forty places would be forty cache entries of the
 * same row.
 *
 * Seeded server-side from the layout so the first render already knows.
 */
import type { BrandingDto } from "@/lib/api/types";
import { applyBranding } from "@/lib/branding/css";
import { createStore } from "./createStore";

/** What the API returns before a company has saved anything of its own. */
export const DEFAULT_BRANDING: BrandingDto = {
  companyName: "PM Konstruct",
  logoUrl: null,
  bannerUrl: null,
  primaryColor: "#E84E1B",
  sidebarColor: "#0f1117",
  jobDisplayMode: "job_number",
  emailSendMode: "device",
  updatedAt: "",
};

export interface BrandingState {
  branding: BrandingDto;
  setBranding: (branding: BrandingDto) => void;
}

export const useBrandingStore = createStore<BrandingState>(
  (set) => ({
    branding: DEFAULT_BRANDING,
    setBranding: (branding) => {
      // The server already wrote these variables into the document for the
      // first paint; this keeps them right when the settings page saves.
      applyBranding(branding);
      set({ branding }, false, "branding/set");
    },
  }),
  { name: "branding" },
);
