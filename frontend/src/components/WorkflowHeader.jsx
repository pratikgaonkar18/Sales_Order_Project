import { getStageDisplay, normalizeStage } from "../utils/stageUtils";

const STAGE_BADGE_STYLE = {
  DRAFT: { backgroundColor: "#fef3c7", color: "#92400e" },
  ENGINEERING_REVIEW: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  ENGINEERING_APPROVED: { backgroundColor: "#dcfce7", color: "#166534" },
  PROBLEM: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

export function calculateDaysWaiting(lastUpdated) {
  if (!lastUpdated) {
    return 0;
  }

  const updatedDate = new Date(lastUpdated);
  if (Number.isNaN(updatedDate.getTime())) {
    return 0;
  }

  const now = new Date();
  const diffMs = now.getTime() - updatedDate.getTime();
  const oneDayMs = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor(diffMs / oneDayMs));
}

export default function WorkflowHeader({
  salesOrder,
  customerName,
  currentStage,
  owner,
  lastUpdated,
  handleStageChange,
  actionDisabled,
  actionHandlers,
}) {
  const stageKey = normalizeStage(currentStage || "DRAFT");
  const badgeStyle = STAGE_BADGE_STYLE[stageKey] || { backgroundColor: "#e5e7eb", color: "#374151" };
  const daysWaiting = calculateDaysWaiting(lastUpdated);

  const stageActions = getStageActions(stageKey);

  return (
    <section
      style={{
        border: "1px solid #d3e5e0",
        borderRadius: 12,
        padding: 14,
        background: "#f7fbfa",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
        }}
      >
        <HeaderField label="Sales Order Number" value={salesOrder || "-"} />
        <HeaderField label="Customer Name" value={customerName || "-"} />
        <div>
          <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>Current Stage</div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              ...badgeStyle,
            }}
          >
            {getStageDisplay(stageKey)}
          </span>
        </div>
        <HeaderField label="Current Owner" value={owner || "PM"} />
        <HeaderField label="Days Waiting" value={String(daysWaiting)} />
      </div>

      {stageActions.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {stageActions.map((action) => (
            <button
              key={action.value}
              type="button"
              onClick={() => (actionHandlers?.[action.value] || handleStageChange)?.(action.value)}
              disabled={Boolean(actionDisabled?.[action.value])}
              style={{
                border: "1px solid #c5d8d2",
                background: "#ffffff",
                color: "#0f2a38",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                cursor: actionDisabled?.[action.value] ? "not-allowed" : "pointer",
                opacity: actionDisabled?.[action.value] ? 0.55 : 1,
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function getStageActions(stage) {
  if (stage === "DRAFT") {
    return [{ value: "SUBMIT_ENGINEERING", label: "Submit for Engineering Review" }];
  }

  if (stage === "ENGINEERING_REVIEW") {
    return [
      { value: "APPROVE", label: "Approve" },
      { value: "SEND_BACK", label: "Send Back to PM" },
      { value: "MARK_PROBLEM", label: "Mark as Problem" },
    ];
  }

  if (stage === "ENGINEERING_APPROVED") {
    return [
      { value: "RELEASE_PRODUCTION", label: "Release to Production" },
      { value: "SEND_BACK_ENGINEERING", label: "Send Back to Engineering" },
    ];
  }

  return [];
}

function HeaderField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#0f2a38" }}>{value}</div>
    </div>
  );
}