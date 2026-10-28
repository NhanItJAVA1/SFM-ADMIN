import { ForecastTrainingResult } from "@/components/admin/forecast/forecast-training-result";
import { ForecastTrainingWorkspace } from "@/components/admin/forecast/forecast-training-workspace";
import { useAdminPageActive } from "@/hooks/use-admin-resource";

export default function TrainingPage() {
  const active = useAdminPageActive();
  return <ForecastTrainingWorkspace active={active} renderResult={result => <ForecastTrainingResult result={result} />} />;
}
