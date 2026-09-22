import type { Metadata } from "next";
import { SetupForm } from "./SetupForm";

export const metadata: Metadata = { title: "First run" };

export default function SetupPage() {
  return <SetupForm />;
}
