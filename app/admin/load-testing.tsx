import { AdminLoadTestingWorkspace } from "@/components/admin/admin-load-testing-workspace";
import { useAdminPageActive } from "@/hooks/use-admin-resource";
import { Redirect } from "expo-router";

export default function LoadTestingPage() {
  const active = useAdminPageActive();
  if (!__DEV__) return <Redirect href="/admin" />;
  return <AdminLoadTestingWorkspace active={active} />;
}
