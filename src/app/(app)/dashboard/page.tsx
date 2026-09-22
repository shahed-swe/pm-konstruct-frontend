import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The dashboard.
 *
 * The panels themselves arrive with the screen work; what is here is the
 * guard and the greeting, which is enough to prove the session, the shell,
 * the branding and the API all line up end to end.
 */
export default async function DashboardPage() {
  const session = await getSession();

  return (
    <RequireAccess module="dashboard">
      <h1 className="text-2xl font-semibold">
        Good to see you{session ? `, ${session.user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your jobs, diaries and call forwards appear here.
      </p>
    </RequireAccess>
  );
}
