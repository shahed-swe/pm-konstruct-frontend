"use client";

/**
 * Approved extensions of time raised against this job.
 *
 * An ETO is a diary note that a manager approved, not a record of its own,
 * so each one links back to the entry it was raised in.
 */
import { CheckCircle2, ClipboardList, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/atoms/Badge";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { useJobEtos } from "@/lib/api/resources/diary";
import { formatDate } from "@/lib/utils/format";

export function JobEtosPanel({ jobId }: { jobId: number }) {
  const { data: etos, isLoading } = useJobEtos(jobId);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" /> ETOs
          {!isLoading && (etos ?? []).length > 0 && (
            <Badge variant="secondary">{etos?.length} approved</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0" aria-busy={isLoading}>
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-4/5" />
          </div>
        ) : (etos ?? []).length === 0 ? (
          <div className="px-4 py-8 text-center">
            <ClipboardList className="mx-auto mb-2 h-7 w-7 opacity-30" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No approved ETOs on this job.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {(etos ?? []).map((eto) => (
              <li key={eto.noteId}>
                <Link
                  href={`/site-diary/${eto.entryId}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <span className="rounded-lg bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">ETO {eto.etoNumber}</span>
                      <Badge variant="secondary">Approved</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Raised by {eto.raisedBy} · {formatDate(eto.diaryDate)}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
