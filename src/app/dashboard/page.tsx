import { redirect } from "next/navigation";

/** Legacy path: the dashboard lives under /app/dashboard. */
export default function LegacyDashboardRedirect() {
  redirect("/app/dashboard");
}
