import { adminPaths } from "@/components/admin/admin-navigation";
import type { AdminView } from "@/components/admin/admin-shell";
import { DashboardPage } from "@/components/admin/pages/dashboard-page";
import { Redirect, useLocalSearchParams } from "expo-router";

export default function AdminIndex() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  // Preserve bookmarks from the old /admin?view=... navigation.
  if (view && view !== "dashboard" && Object.hasOwn(adminPaths, view) && (view !== "load-testing" || __DEV__)) {
    return <Redirect href={adminPaths[view as AdminView]} />;
  }
  return <DashboardPage />;
}
