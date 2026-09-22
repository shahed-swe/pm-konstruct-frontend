"use client";

import { useBrandingStore } from "@/stores/branding.store";
import { labelJob, type JobRef } from "./label";

/** The company's chosen job label, for a component. */
export function useJobLabel(): (job: JobRef) => string {
  const mode = useBrandingStore((s) => s.branding.jobDisplayMode);
  return (job: JobRef) => labelJob(job, mode);
}
