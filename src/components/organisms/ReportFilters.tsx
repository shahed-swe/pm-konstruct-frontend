"use client";

/**
 * The filter bar every report shares.
 *
 * One component rather than eight copies: the legacy repeated this on each
 * report and they had drifted -- two offered a supervisor filter, one
 * defaulted the range to a month and the others to nothing.
 */
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Field } from "@/components/molecules/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { useReportMeta } from "@/lib/api/resources/reports";
import type { ReportFilters } from "@/lib/api/resources/reports";

export function ReportFilterBar({
  filters,
  onChange,
  show = { job: true, supervisor: true, dates: true },
}: {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  show?: { job?: boolean; supervisor?: boolean; dates?: boolean };
}) {
  const { data: meta } = useReportMeta();

  function set(patch: Partial<ReportFilters>) {
    onChange({ ...filters, ...patch });
  }

  const anySet =
    filters.jobId !== undefined ||
    filters.supervisorId !== undefined ||
    (filters.dateFrom !== undefined && filters.dateFrom !== "") ||
    (filters.dateTo !== undefined && filters.dateTo !== "");

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
      {show.job !== false && (
        <Field label="Job" className="min-w-52 flex-1">
          {(props) => (
            <Select
              value={filters.jobId === undefined ? "all" : String(filters.jobId)}
              onValueChange={(v) =>
                set({ jobId: v === "all" ? undefined : Number.parseInt(v, 10) })
              }
            >
              <SelectTrigger id={props.id}>
                <SelectValue placeholder="All jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                {(meta?.jobs ?? []).map((job) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.jobNumber} — {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}

      {show.supervisor !== false && (
        <Field label="Supervisor" className="min-w-44 flex-1">
          {(props) => (
            <Select
              value={filters.supervisorId === undefined ? "all" : String(filters.supervisorId)}
              onValueChange={(v) =>
                set({ supervisorId: v === "all" ? undefined : Number.parseInt(v, 10) })
              }
            >
              <SelectTrigger id={props.id}>
                <SelectValue placeholder="All supervisors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All supervisors</SelectItem>
                {(meta?.supervisors ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}

      {show.dates !== false && (
        <>
          <Field label="From" className="w-40">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(e) => set({ dateFrom: e.target.value === "" ? undefined : e.target.value })}
              />
            )}
          </Field>
          <Field label="To" className="w-40">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(e) => set({ dateTo: e.target.value === "" ? undefined : e.target.value })}
              />
            )}
          </Field>
        </>
      )}

      {anySet && (
        <Button variant="ghost" onClick={() => onChange({})}>
          Clear
        </Button>
      )}
    </div>
  );
}
