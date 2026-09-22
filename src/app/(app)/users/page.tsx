import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { UsersScreen } from "@/components/templates/UsersScreen";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <RequireAccess managerOnly>
      <UsersScreen />
    </RequireAccess>
  );
}
