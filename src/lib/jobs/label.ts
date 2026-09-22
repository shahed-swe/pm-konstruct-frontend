/**
 * How a job is named on screen.
 *
 * Each company chooses between its job number, its name and its address, and
 * that choice applies everywhere a job appears -- lists, diaries, call
 * forwards, emails. Ported from the legacy `hooks/useJobLabel.ts`, including
 * its fallback chain: a company that displays by name still needs something
 * to show for a job that has no name.
 */
import type { BrandingDto } from "@/lib/api/types";

export interface JobRef {
  jobNumber?: string | null | undefined;
  jobName?: string | null | undefined;
  jobAddress?: string | null | undefined;
}

export type JobDisplayMode = "job_number" | "job_name" | "job_address";

function first(...values: (string | null | undefined)[]): string {
  // An empty string counts as absent, as the legacy's `||` chain did: a job
  // saved with a blank name should fall through, not render as nothing.
  return values.find((v) => v !== null && v !== undefined && v !== "") ?? "";
}

export function labelJob(job: JobRef, mode: string): string {
  if (mode === "job_name") return first(job.jobName, job.jobNumber, job.jobAddress);
  if (mode === "job_address") return first(job.jobAddress, job.jobNumber, job.jobName);
  return first(job.jobNumber, job.jobName, job.jobAddress);
}

export function jobLabeller(branding: Pick<BrandingDto, "jobDisplayMode">) {
  return (job: JobRef): string => labelJob(job, branding.jobDisplayMode);
}
