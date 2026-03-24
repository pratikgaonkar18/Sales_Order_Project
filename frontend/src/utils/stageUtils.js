export const stageDisplayMap = {
  DRAFT: "Draft",
  ENGINEERING_REVIEW: "Engineering Review",
  ENGINEERING_APPROVED: "Engineering Approved",
  RELEASED_TO_PRODUCTION: "Released to Production",
};

export function normalizeStage(stage) {
  const normalized = String(stage || "")
    .toUpperCase()
    .replaceAll(" ", "_");

  if (normalized === "PRODUCTION_RELEASE") {
    return "RELEASED_TO_PRODUCTION";
  }

  return normalized;
}

export function getStageDisplay(stage) {
  const normalized = normalizeStage(stage);
  if (stageDisplayMap[normalized]) {
    return stageDisplayMap[normalized];
  }

  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}
