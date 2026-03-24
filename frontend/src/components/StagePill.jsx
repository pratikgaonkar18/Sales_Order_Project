import { getStageDisplay, normalizeStage } from "../utils/stageUtils";

function stageClass(stage) {
  const value = normalizeStage(stage);
  if (value === "DRAFT") {
    return "stage-pill stage-draft";
  }
  if (value === "ENGINEERING_REVIEW") {
    return "stage-pill stage-engineering-review";
  }
  if (value === "ENGINEERING_APPROVED") {
    return "stage-pill stage-engineering-approved";
  }
  if (value === "RELEASED_TO_PRODUCTION") {
    return "stage-pill stage-released-to-production";
  }
  if (value.includes("CLARIFICATION") || value.includes("CANCELLED")) {
    return "stage-pill stage-problem";
  }
  return "stage-pill stage-active";
}

export default function StagePill({ stage }) {
  return <span className={stageClass(stage)}>{getStageDisplay(stage)}</span>;
}
