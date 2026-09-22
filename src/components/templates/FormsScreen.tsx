import { ChevronRight, ClipboardList, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/molecules/Card";
import { PageHeader } from "@/components/molecules/PageHeader";

const FORMS = [
  {
    href: "/forms/property-inspection",
    title: "Site inspection",
    description:
      "Walk a house room by room, logging defects and what has been actioned. Saves into the job's diary.",
    Icon: ClipboardList,
  },
  {
    href: "/forms/eto",
    title: "Extra to order",
    description:
      "Record extra work or materials and send it for a manager's approval. Once approved it can be shared from your phone.",
    Icon: FilePlus2,
  },
] as const;

export function FormsScreen() {
  return (
    <>
      <PageHeader title="Forms" description="Fill one out, and it files itself into the job." />

      <ul className="max-w-3xl space-y-3">
        {FORMS.map(({ href, title, description, Icon }) => (
          <li key={href}>
            <Link href={href} className="block">
              <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
                <CardContent className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{title}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
