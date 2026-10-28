import { AnalysisConfigWorkspace } from "@/components/admin/analysis-config-workspace";
import { useAdminPageActive } from "@/hooks/use-admin-resource";

export default function AnalysisConfigPage() {
  const active = useAdminPageActive();
  return <AnalysisConfigWorkspace active={active} />;
}
