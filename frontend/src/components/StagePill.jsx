import { getStageDisplay, normalizeStage } from "../utils/stageUtils";

function stageClass(stage) {
  const value = normalizeStage(stage);

  const className = `stage-pill stage-${value?.toLowerCase().replace(/_/g, "-")}`;

  return value ? className : "stage-pill stage-active";
}

export default function StagePill({ stage }) {
  return <span className={stageClass(stage)}>{getStageDisplay(stage)}</span>;
}
