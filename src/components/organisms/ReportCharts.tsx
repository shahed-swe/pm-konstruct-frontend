"use client";

/**
 * The charts the reports draw.
 *
 * Recharts, as the current app uses. Every chart is paired with the table it
 * summarises rather than standing alone: a bar someone cannot read the
 * number off is decoration.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DelayDto, JobProgressDto, SupervisorPerformanceDto } from "@/lib/api/types";

/** The chart palette, taken from the tokens so branding reaches it. */
const COLOURS = {
  score: "#8b5cf6",
  completion: "#06b6d4",
  diary: "#10b981",
  critical: "#ef4444",
  major: "#f59e0b",
  minor: "#94a3b8",
} as const;

export function SupervisorScoreChart({ rows }: { rows: SupervisorPerformanceDto[] }) {
  const data = rows.map((row) => ({
    name: row.name.split(" ")[0] ?? row.name,
    score: row.performanceScore,
    completion: Math.round((row.onTimeCompletionRate ?? 0) * 100),
    diary: Math.round((row.diaryComplianceRate ?? 0) * 100),
  }));

  if (data.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">How each supervisor is tracking</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="score" name="Overall" fill={COLOURS.score} radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="completion"
            name="Finished on time"
            fill={COLOURS.completion}
            radius={[4, 4, 0, 0]}
          />
          <Bar dataKey="diary" name="Diary kept" fill={COLOURS.diary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DelaySeverityChart({ rows }: { rows: DelayDto[] }) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.severity, (counts.get(row.severity) ?? 0) + 1);

  const data = (["critical", "major", "minor"] as const)
    .map((severity) => ({ name: severity, count: counts.get(severity) ?? 0 }))
    .filter((d) => d.count > 0);

  if (data.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">How bad the delays are</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
          <Tooltip />
          <Bar dataKey="count" name="Items" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLOURS[entry.name as keyof typeof COLOURS]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function JobHealthChart({ rows }: { rows: JobProgressDto[] }) {
  const data = rows
    .slice(0, 12)
    .map((row) => ({ name: row.jobNumber, complete: row.completionPct, delayed: row.delayedCount }));

  if (data.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">How far along each job is</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} height={50} textAnchor="end" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="complete" name="Percent complete" fill={COLOURS.completion} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
