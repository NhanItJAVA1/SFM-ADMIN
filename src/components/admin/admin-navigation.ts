import { router } from "expo-router";
import type { AdminView } from "./admin-shell";

export const adminPaths = {
  dashboard: "/admin",
  users: "/admin/users",
  categories: "/admin/categories",
  documents: "/admin/documents",
  training: "/admin/training",
  monitoring: "/admin/monitoring",
  "analysis-config": "/admin/analysis-config",
  "load-testing": "/admin/load-testing",
} as const satisfies Record<AdminView, string>;

export function navigateAdmin(view: AdminView) {
  router.navigate(adminPaths[view]);
}

export function navigateToAdminUser(id: number) {
  router.navigate({ pathname: adminPaths.users, params: { userId: String(id) } });
}

export function adminViewFromPath(pathname: string): AdminView {
  return (Object.entries(adminPaths).find(([, path]) => path !== "/admin" &&
    (pathname === path || pathname.startsWith(`${path}/`)))?.[0] as AdminView | undefined) ?? "dashboard";
}
