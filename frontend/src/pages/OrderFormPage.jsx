import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { createOrder, fetchOrderById, toStageLabel } from "../api/ordersApi";
import WorkflowHeader from "../components/WorkflowHeader";
import { normalizeStage } from "../utils/stageUtils";
import { useNavigate } from "react-router-dom";

const MOCK_ORDERS_KEY = "order-workflow-mock-orders";

const INITIAL_ORDER = {
  salesOrderNo: "",
  division: "OEM",
  customerName: "",
  customerPo: "",
  projectName: "",
  assignedEngineer: "",
  referenceSerialNumber: "",
  submittalDate: "",
  shipDate: "",
  projectManager: "",
  testSheetStatus: "NO",
  tagStatus: "NO",
  hmrStatus: "NO",
  notes: "",
  currentStage: "DRAFT",
  owner: "PM",
  lastUpdated: "",
};

const INITIAL_LINE = {
  itemNo: "001",
  description: "",
  quantity: 1,
  material: "",
  partNumber: "",
  revision: "",
  revisionDefaultInSystem: "UNKNOWN",
  pnRevVerification: "",
  newSerialNumber: "",
  referenceSerialNumber: "",
  lineStatus: "ACTIVE",
  drawingStatus: "NO",
  notes: "",
};

const engineers = [
  { id: 1, name: "Prajay G" },
  { id: 2, name: "Ahmed A" },
  { id: 3, name: "Yowhannes R" },
];

const projectManagers = [
  "Chielo A",
  "Jennifer T",
  "Jessie C",
  "Jordan C",
  "Moonhwa F",
  "April A",
];

function toNullableBoolean(value) {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "" || normalized === "UNKNOWN") {
    return null;
  }
  if (normalized === "TRUE" || normalized === "YES") {
    return true;
  }
  if (normalized === "FALSE" || normalized === "NO") {
    return false;
  }
  return null;
}

function normalizeYesNoNa(value, fallback = "NO") {
  const normalized = String(value ?? "").toUpperCase();

  if (normalized === "CORRECT") {
    return "YES";
  }
  if (normalized === "INCORRECT") {
    return "NO";
  }
  if (normalized === "PENDING") {
    return "NA";
  }
  if (normalized === "YES" || normalized === "NO" || normalized === "NA") {
    return normalized;
  }

  return fallback;
}

function normalizeRevDefault(value, fallback = "UNKNOWN") {
  const normalized = String(value ?? "").toUpperCase();

  if (normalized === "TRUE" || normalized === "YES") {
    return "YES";
  }
  if (normalized === "FALSE" || normalized === "NO") {
    return "NO";
  }
  if (normalized === "" || normalized === "UNKNOWN") {
    return "UNKNOWN";
  }

  return fallback;
}

function normalizePnRev(value, fallback = "") {
  const normalized = String(value ?? "").toUpperCase();

  if (normalized === "CORRECT" || normalized === "YES") {
    return "CORRECT";
  }
  if (normalized === "REVISED" || normalized === "NO" || normalized === "INCORRECT") {
    return "REVISED";
  }
  if (normalized === "NA" || normalized === "PENDING") {
    return "";
  }

  return fallback;
}

function isPnRevValid(value) {
  return value === "CORRECT" || value === "REVISED";
}

function canEditPMFields(stage) {
  return stage === "DRAFT";
}

function canEditEngineeringFields(stage) {
  return stage === "ENGINEERING_REVIEW";
}

function canEditHMR(stage) {
  return stage === "ENGINEERING_REVIEW" || stage === "RELEASED_TO_PRODUCTION";
}

function canEditPartNumberAndRevision(stage) {
  return stage === "DRAFT" || stage === "ENGINEERING_REVIEW";
}

function canEditCommonFields(stage) {
  return stage === "DRAFT";
}

function canUpdateOrder(stage) {
  return stage === "ENGINEERING_REVIEW" || stage === "RELEASED_TO_PRODUCTION";
}

function isPMStage(stage) {
  return stage === "DRAFT";
}

function isEngineeringStage(stage) {
  return stage === "ENGINEERING_REVIEW";
}

function readMockOrders() {
  try {
    const raw = window.localStorage.getItem(MOCK_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMockOrders(records) {
  window.localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(records));
}

function upsertMockOrder(record) {
  const records = readMockOrders();
  const index = records.findIndex(
    (item) =>
      String(item.id || "") === String(record.id || "") ||
      String(item.salesOrderNo || "") === String(record.salesOrderNo || ""),
  );

  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  writeMockOrders(records);
}

function findMockOrder(orderId, salesOrderNo) {
  const records = readMockOrders();
  return records.find(
    (item) =>
      (orderId && String(item.id || "") === String(orderId)) ||
      (salesOrderNo && String(item.salesOrderNo || "") === String(salesOrderNo)),
  );
}

function normalizeLoadedOrder(loadedOrder = {}, fallback = INITIAL_ORDER) {
  const normalizedStageInput = loadedOrder.currentStage ?? loadedOrder.stage ?? loadedOrder.status ?? fallback.currentStage;
  const normalizedStage = normalizeStage(normalizedStageInput);

  const normalizedOwnerInput = loadedOrder.owner ?? loadedOrder.currentOwnerRole ?? fallback.owner;
  const normalizedOwner = normalizedOwnerInput === "Production"
    || normalizedOwnerInput === "PRODUCTION"
    ? "PM"
    : normalizedOwnerInput;

  return {
    ...fallback,
    ...loadedOrder,
    salesOrderNo: loadedOrder.salesOrderNo ?? loadedOrder.salesOrder ?? fallback.salesOrderNo,
    customerName: loadedOrder.customerName ?? fallback.customerName,
    customerPo: loadedOrder.customerPo ?? loadedOrder.customerPO ?? fallback.customerPo,
    division: loadedOrder.division ?? fallback.division,
    projectName: loadedOrder.projectName ?? fallback.projectName,
    projectManager: loadedOrder.projectManager ?? fallback.projectManager,
    assignedEngineer: loadedOrder.assignedEngineer ?? fallback.assignedEngineer,
    submittalDate: loadedOrder.submittalDate ?? fallback.submittalDate,
    shipDate: loadedOrder.shipDate ?? fallback.shipDate,
    testSheetStatus: normalizeYesNoNa(
      loadedOrder.testSheetStatus ?? loadedOrder.testSheet ?? fallback.testSheetStatus,
      fallback.testSheetStatus,
    ),
    tagStatus: normalizeYesNoNa(loadedOrder.tagStatus ?? loadedOrder.tag ?? fallback.tagStatus, fallback.tagStatus),
    hmrStatus: normalizeYesNoNa(loadedOrder.hmrStatus ?? loadedOrder.hmr ?? fallback.hmrStatus, fallback.hmrStatus),
    referenceSerialNumber: loadedOrder.referenceSerialNumber ?? loadedOrder.referenceSerial ?? fallback.referenceSerialNumber,
    currentStage: normalizedStage,
    owner: normalizedOwner,
    lastUpdated: loadedOrder.lastUpdated ?? loadedOrder.stageUpdatedAt ?? loadedOrder.updatedAt ?? fallback.lastUpdated,
    notes: loadedOrder.notes ?? fallback.notes,
  };
}

function normalizeLoadedLine(loadedLine = {}, fallback = INITIAL_LINE) {
  const quantityValue = loadedLine.quantity ?? fallback.quantity;

  return {
    ...fallback,
    ...loadedLine,
    itemNo: loadedLine.itemNo ?? fallback.itemNo,
    description: loadedLine.description ?? fallback.description,
    quantity: Number(quantityValue) || 1,
    material: loadedLine.material ?? fallback.material,
    partNumber: loadedLine.partNumber ?? fallback.partNumber,
    revision: loadedLine.revision ?? fallback.revision,
    revisionDefaultInSystem: normalizeRevDefault(
      loadedLine.revisionDefaultInSystem ?? loadedLine.revDefaultInSystem ?? fallback.revisionDefaultInSystem,
      fallback.revisionDefaultInSystem,
    ),
    pnRevVerification: normalizePnRev(
      loadedLine.pnRevVerification ?? loadedLine.pnRevVerified ?? fallback.pnRevVerification,
      fallback.pnRevVerification,
    ),
    newSerialNumber: loadedLine.newSerialNumber ?? fallback.newSerialNumber,
    referenceSerialNumber: loadedLine.referenceSerialNumber ?? loadedLine.lineReferenceSerial ?? fallback.referenceSerialNumber,
    lineStatus: loadedLine.lineStatus ?? fallback.lineStatus,
    drawingStatus: normalizeYesNoNa(loadedLine.drawingStatus ?? loadedLine.drawing ?? fallback.drawingStatus, fallback.drawingStatus),
    notes: loadedLine.notes ?? fallback.notes,
  };
}

function normalizeLoadedLines(source = {}, fallback = INITIAL_LINE) {
  const candidateLines = Array.isArray(source?.lines)
    ? source.lines
    : Array.isArray(source?.lineItems)
      ? source.lineItems
      : Array.isArray(source)
        ? source
        : [source?.line || source];

  const normalized = candidateLines
    .filter(Boolean)
    .map((line, index) => {
      const fallbackWithIndex = {
        ...fallback,
        itemNo: String(index + 1).padStart(3, "0"),
      };
      return normalizeLoadedLine(line, fallbackWithIndex);
    });

  if (normalized.length === 0) {
    return [{ ...fallback }];
  }

  return normalized;
}

function mergeOrderTrackingFromLines(loadedOrder, loadedLines) {
  const firstLine = loadedLines[0] || {};

  return {
    ...loadedOrder,
    testSheetStatus: normalizeYesNoNa(
      loadedOrder.testSheetStatus ?? loadedOrder.testSheet ?? firstLine.testSheetStatus ?? firstLine.testSheet,
      INITIAL_ORDER.testSheetStatus,
    ),
    tagStatus: normalizeYesNoNa(
      loadedOrder.tagStatus ?? loadedOrder.tag ?? firstLine.tagStatus ?? firstLine.tag,
      INITIAL_ORDER.tagStatus,
    ),
    hmrStatus: normalizeYesNoNa(
      loadedOrder.hmrStatus ?? loadedOrder.hmr ?? firstLine.hmrStatus ?? firstLine.hmr,
      INITIAL_ORDER.hmrStatus,
    ),
  };
}

function toPnRevPayloadValue(value) {
  const normalized = normalizePnRev(value, "");
  if (normalized === "CORRECT") {
    return "CORRECT";
  }
  if (normalized === "REVISED") {
    return "INCORRECT";
  }
  return "PENDING";
}

function buildOrderSnapshot({ id, order, lineItems }) {
  const normalizedOrder = normalizeLoadedOrder(order, INITIAL_ORDER);
  const normalizedLineItems = normalizeLoadedLines(lineItems, INITIAL_LINE);
  const normalizedLine = normalizedLineItems[0];
  const notes = normalizedLine.notes || normalizedOrder.notes || "";
  const referenceSerialNumber = normalizedLine.referenceSerialNumber || normalizedOrder.referenceSerialNumber;

  const fullOrder = {
    salesOrder: normalizedOrder.salesOrderNo,
    customerName: normalizedOrder.customerName,
    customerPO: normalizedOrder.customerPo,
    division: normalizedOrder.division,
    projectName: normalizedOrder.projectName,
    projectManager: normalizedOrder.projectManager,
    assignedEngineer: normalizedOrder.assignedEngineer,
    submittalDate: normalizedOrder.submittalDate,
    shipDate: normalizedOrder.shipDate,
    referenceSerial: referenceSerialNumber,
    itemNo: normalizedLine.itemNo,
    description: normalizedLine.description,
    quantity: normalizedLine.quantity,
    material: normalizedLine.material,
    partNumber: normalizedLine.partNumber,
    revision: normalizedLine.revision,
    revDefaultInSystem: normalizedLine.revisionDefaultInSystem,
    pnRevVerified: normalizedLine.pnRevVerification,
    newSerialNumber: normalizedLine.newSerialNumber,
    lineReferenceSerial: normalizedLine.referenceSerialNumber,
    lineStatus: normalizedLine.lineStatus,
    drawing: normalizedLine.drawingStatus,
    testSheet: normalizedOrder.testSheetStatus,
    tag: normalizedOrder.tagStatus,
    hmr: normalizedOrder.hmrStatus,
    notes,
    currentStage: normalizedOrder.currentStage,
    owner: normalizedOrder.owner || "PM",
    lastUpdated: normalizedOrder.lastUpdated || new Date().toISOString(),
  };

  return {
    id,
    salesOrderNo: normalizedOrder.salesOrderNo,
    updatedAt: new Date().toISOString(),
    order: {
      ...normalizedOrder,
      referenceSerialNumber,
      notes,
    },
    line: {
      ...normalizedLine,
      notes,
    },
    lineItems: normalizedLineItems,
    notes,
    fullOrder,
  };
}

export default function OrderFormPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(INITIAL_ORDER);
  const [lineItems, setLineItems] = useState([INITIAL_LINE]);
  const [mode, setMode] = useState("create");
  const [submitting, setSubmitting] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [wasPMReady, setWasPMReady] = useState(false);
  const navigate = useNavigate();
  

  const isAmOrder = useMemo(() => order.division === "AM", [order.division]);
  const currentStage = normalizeStage(order.currentStage);
  const isPMEditable = currentStage === "DRAFT";
  const isEngineeringEditable = currentStage === "ENGINEERING_REVIEW";
  const isPartEditable = isPMEditable || isEngineeringEditable;

  const pmStageActive = isPMStage(currentStage);
  const engineeringStageActive = isEngineeringStage(currentStage);

  console.log("RENDERING OrderFormPage");
  console.log("currentStage:", currentStage);
  console.log("showErrors:", showErrors);
  console.log("lineItems:", lineItems);

  const isLineActive = (line) => {
    return (
      line.description?.trim() !== "" ||
      (line.quantity && Number(line.quantity) > 0) ||
      line.partNumber?.trim() !== "" ||
      line.revision?.trim() !== ""
    );
  };

  const lines = lineItems;
  const activeLines = lines.filter(isLineActive);

  function getPMMissingFields() {
  const missing = [];

  if (!(order.salesOrderNo || order.salesOrderNumber)) {
    missing.push("Sales Order Number");
  }
  if (!order.division) missing.push("Division");
  if (!order.customerName) missing.push("Customer Name");
  if (!(order.customerPo || order.customerPO)) {
    missing.push("Customer PO");
  }
  if (!order.projectManager) missing.push("Project Manager");
  if (!order.submittalDate) missing.push("Submittal Date");

  if (lines.length === 0) {
    missing.push("At least one Line Item required");
  } else {
    lines.forEach((line, index) => {
      if (!line.description?.trim()) {
  missing.push({ line: index, field: "description" });
}

if (!(line.quantity && Number(line.quantity) > 0)) {
  missing.push({ line: index, field: "quantity" });
}
    });
  }

  return missing;
}

function getEngineeringMissingFields() {
  const missing = [];

  if (lineItems.length === 0) {
    missing.push({ type: "global", field: "lineItem" });
  } else {
    lineItems.forEach((line, index) => {
      if (!String(line.partNumber || "").trim()) {
        missing.push({ line: index, field: "partNumber" });
      }

      if (!String(line.description || "").trim()) {
        missing.push({ line: index, field: "description" });
      }

      if (!(line.quantity && Number(line.quantity) > 0)) {
        missing.push({ line: index, field: "quantity" });
      }

      if (!String(line.revision || "").trim()) {
        missing.push({ line: index, field: "revision" });
      }

      if (line.revisionDefaultInSystem !== "YES") {
        missing.push({ line: index, field: "revDefault" });
      }

      if (!isPnRevValid(line.pnRevVerification)) {
        missing.push({ line: index, field: "pnVerify" });
      }
    });
  }

  return missing;
}
function isFieldMissing(fieldName) {
  return showErrors && missingFields.includes(fieldName);
}

function isEngineeringFieldMissing(index, field) {
  if (!showErrors) return false;

  const missing = getEngineeringMissingFields();

  return missing.some(
    m => m && m.line === index && m.field === field
  );
}

function isFieldError(index, field) {
  // Engineering stage → strict line-level validation
  if (engineeringStageActive) {
    return isEngineeringFieldMissing(index, field);
  }

  // PM stage → use existing missingFields (line-aware)
  if (!showErrors) return false;

return missingFields.some(
  (m) => m.line === index && m.field === field
);
}

  function isPMReady() {
  return getPMMissingFields().length === 0;
}

  function isEngineeringReady() {
    if (activeLines.length === 0) {
      return false;
    }

    return activeLines.every(
      (line) =>
        line.partNumber?.trim() !== "" &&
        line.description?.trim() !== "" &&
        Number(line.quantity) > 0 &&
        line.revision?.trim() !== "" &&
        line.revisionDefaultInSystem === "YES" &&
        isPnRevValid(line.pnRevVerification),
    );
  }

  const workflowHeaderData = {
    salesOrder: order.salesOrder || order.salesOrderNo,
    customerName: order.customerName,
    currentStage,
    owner: order.owner || "PM",
    lastUpdated: order.lastUpdated || order.submittalDate || new Date().toISOString(),
  };

  useEffect(() => {
    let ignore = false;

    async function loadExistingOrder() {
      if (!orderId) {
        setMode("create");
        setOrder(INITIAL_ORDER);
        setLineItems([INITIAL_LINE]);
        setLoadingOrder(false);
        return;
      }

      setMode("edit");
      setLoadingOrder(true);
      setError("");

      const routeOrder = location.state?.order;
      const hasRouteOrder = Boolean(routeOrder);

      const mockOrder = findMockOrder(orderId, routeOrder?.salesOrderNo);
      if (mockOrder) {
        const loadedOrder = normalizeLoadedOrder(mockOrder.order || mockOrder.fullOrder || mockOrder, INITIAL_ORDER);
        const loadedLines = normalizeLoadedLines(mockOrder, INITIAL_LINE);
        const trackedOrder = mergeOrderTrackingFromLines(loadedOrder, loadedLines);
        const mergedNotes = loadedLines[0]?.notes || loadedOrder.notes || mockOrder.notes || "";

        setOrder((prev) => ({
          ...prev,
          ...trackedOrder,
          currentStage: trackedOrder.currentStage ?? prev.currentStage,
          owner: trackedOrder.owner || prev.owner || "PM",
          lastUpdated: trackedOrder.lastUpdated || mockOrder.updatedAt || new Date().toISOString(),
          notes: mergedNotes,
        }));
        setLineItems(
          loadedLines.map((item, index) => ({
            ...item,
            notes: index === 0 ? mergedNotes : item.notes,
          })),
        );
        setLoadingOrder(false);
        return;
      }

      if (hasRouteOrder) {
        const loadedOrder = normalizeLoadedOrder(routeOrder, INITIAL_ORDER);
        const loadedLines = normalizeLoadedLines(routeOrder, INITIAL_LINE);
        const trackedOrder = mergeOrderTrackingFromLines(loadedOrder, loadedLines);
        const mergedNotes = loadedLines[0]?.notes || loadedOrder.notes || "";

        setOrder((prev) => ({
          ...prev,
          ...trackedOrder,
          currentStage: trackedOrder.currentStage ?? prev.currentStage,
          owner: trackedOrder.owner || prev.owner || "PM",
          lastUpdated: trackedOrder.lastUpdated || prev.lastUpdated || new Date().toISOString(),
          notes: mergedNotes,
        }));
        setLineItems(
          loadedLines.map((item, index) => ({
            ...item,
            notes: index === 0 ? mergedNotes : item.notes,
          })),
        );
      }

      try {
        const data = await fetchOrderById(orderId);
        if (ignore) {
          return;
        }

        const loadedOrder = normalizeLoadedOrder(data, INITIAL_ORDER);
        const loadedLines = normalizeLoadedLines(data, INITIAL_LINE);
        const trackedOrder = mergeOrderTrackingFromLines(loadedOrder, loadedLines);
        const mergedNotes = loadedLines[0]?.notes || loadedOrder.notes || "";

        setOrder((prev) => ({
          ...prev,
          ...trackedOrder,
          currentStage: trackedOrder.currentStage ?? prev.currentStage,
          owner: trackedOrder.owner || prev.owner || "PM",
          lastUpdated: trackedOrder.lastUpdated || new Date().toISOString(),
          notes: mergedNotes,
        }));
        setLineItems(
          loadedLines.map((item, index) => ({
            ...item,
            notes: index === 0 ? mergedNotes : item.notes,
          })),
        );
      } catch (err) {
        if (!ignore && !hasRouteOrder) {
          setError(err.message || "Failed to load order.");
        }
      } finally {
        if (!ignore) {
          setLoadingOrder(false);
        }
      }
    }

    loadExistingOrder();
    return () => {
      ignore = true;
    };
  }, [orderId, location.state]);

  useEffect(() => {
  if (isPMReady()) {
    setWasPMReady(true);
  }
}, [order, lineItems]);

useEffect(() => {
  window.scrollTo({ top: 0, behavior: "smooth" });
}, [orderId]);

useEffect(() => {
  if (wasPMReady && !isPMReady()) {
    setShowErrors(true);
  }
}, [order, lineItems, wasPMReady]);

  function handleSubmitForEngineering() {
    setShowErrors(true); 
    if (!isPMReady()) {
      setError("Please complete all required PM fields and line item details.");
      return;
    }

    const nowIso = new Date().toISOString();
    setError("");

    setOrder((prev) => {
      const nextOrder = {
        ...prev,
        currentStage: "ENGINEERING_REVIEW",
        owner: "Engineering",
        currentOwner: "Engineering",
        lastUpdated: nowIso,
      };

      if (mode === "edit") {
        const firstLine = lineItems[0] || INITIAL_LINE;
        const snapshot = buildOrderSnapshot({
          id: orderId || nextOrder.salesOrderNo,
          order: nextOrder,
          lineItems: lineItems.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  notes: item.notes || nextOrder.notes || firstLine.notes || "",
                }
              : item,
          ),
        });
        upsertMockOrder(snapshot);
      }

      return nextOrder;
    });
  }

  function handleEngineeringApproval() {
    if (!isEngineeringReady()) {
      setError("Complete all engineering fields for all line items.");
      return;
    }

    const nowIso = new Date().toISOString();
    setError("");

    setOrder((prev) => {
      const nextOrder = {
        ...prev,
        currentStage: "ENGINEERING_APPROVED",
        owner: "PM",
        currentOwner: "PM",
        lastUpdated: nowIso,
      };

      if (mode === "edit") {
        const firstLine = lineItems[0] || INITIAL_LINE;
        const snapshot = buildOrderSnapshot({
          id: orderId || nextOrder.salesOrderNo,
          order: nextOrder,
          lineItems: lineItems.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  notes: item.notes || nextOrder.notes || firstLine.notes || "",
                }
              : item,
          ),
        });
        upsertMockOrder(snapshot);
      }

      return nextOrder;
    });
  }

  function handleStageChange(action) {
    if (action === "SUBMIT_ENGINEERING") {
      handleSubmitForEngineering();
      return;
    }

    if (action === "APPROVE") {
      handleEngineeringApproval();
      return;
    }

    const nowIso = new Date().toISOString();

    setOrder((prev) => {
      let nextOrder = prev;
      if (action === "SEND_BACK") {
        nextOrder = { ...prev, currentStage: "DRAFT", owner: "PM", lastUpdated: nowIso };
      }
      if (action === "MARK_PROBLEM") {
        nextOrder = { ...prev, currentStage: "PROBLEM", owner: "PM", lastUpdated: nowIso };
      }
      if (action === "RELEASE_PRODUCTION") {
        nextOrder = { ...prev, currentStage: "RELEASED_TO_PRODUCTION", owner: "Production", lastUpdated: nowIso };
      }
      if (action === "SEND_BACK_ENGINEERING") {
        nextOrder = { ...prev, currentStage: "ENGINEERING_REVIEW", owner: "Engineering", lastUpdated: nowIso };
      }

      if (mode === "edit" && nextOrder !== prev) {
        const firstLine = lineItems[0] || INITIAL_LINE;
        const snapshot = buildOrderSnapshot({
          id: orderId || nextOrder.salesOrderNo,
          order: nextOrder,
          lineItems: lineItems.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  notes: item.notes || nextOrder.notes || firstLine.notes || "",
                }
              : item,
          ),
        });
        upsertMockOrder(snapshot);
      }

      return nextOrder;
    });
  }

  function handleAddLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        ...INITIAL_LINE,
        itemNo: String(prev.length + 1).padStart(3, "0"),
      },
    ]);
  }

  function handleRemoveLineItem(indexToRemove) {
    if (lineItems.length === 1) {
      return;
    }

    const updated = lineItems
      .filter((_, index) => index !== indexToRemove)
      .map((item, index) => ({
        ...item,
        itemNo: String(index + 1).padStart(3, "0"),
      }));

    setLineItems(updated);
  }

  function updateLineItem(index, key, value) {
    setLineItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }

  function handleUpdateOrder() {
    const nowIso = new Date().toISOString();
    const snapshot = buildOrderSnapshot({
      id: orderId || order.salesOrderNo,
      order: {
        ...order,
        lastUpdated: nowIso,
      },
      lineItems,
    });

    upsertMockOrder(snapshot);

    setOrder((prev) => ({
      ...prev,
      lastUpdated: nowIso,
      notes: snapshot.notes,
    }));
    setLineItems(snapshot.lineItems || [snapshot.line]);
    setMessage(`Order ${snapshot.salesOrderNo} updated.`);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      if (mode === "edit") {
        handleUpdateOrder();
        return;
      }

      const {
        currentStage: _stage,
        owner: _owner,
        lastUpdated: _lastUpdated,
        notes: _notes,
        projectManager: _projectManager,
        ...orderForCreate
      } = order;
      const payload = {
        ...orderForCreate,
        submittalDate: order.submittalDate || null,
        shipDate: order.shipDate || null,
        testSheetStatus: order.testSheetStatus,
        tagStatus: order.tagStatus,
        hmrStatus: order.hmrStatus,
        referenceSerialNumber: lineItems[0]?.referenceSerialNumber || order.referenceSerialNumber || null,
        lines: lineItems.map((lineItem) => ({
          ...lineItem,
          quantity: Number(lineItem.quantity),
          revisionDefaultInSystem: toNullableBoolean(String(lineItem.revisionDefaultInSystem)),
          pnRevVerification: toPnRevPayloadValue(lineItem.pnRevVerification),
          testSheetStatus: order.testSheetStatus,
          tagStatus: order.tagStatus,
          hmrStatus: order.hmrStatus,
          referenceSerialNumber: lineItem.referenceSerialNumber || order.referenceSerialNumber || null,
        })),
      };

      const created = await createOrder(payload);
      navigate(`/order/${created.id}`);

      const snapshot = buildOrderSnapshot({
        id: created.id,
        order: {
          ...order,
          currentStage: created.status || order.currentStage,
          owner: created.currentOwnerRole || order.owner || "PM",
          lastUpdated: new Date().toISOString(),
        },
        lineItems,
      });
      upsertMockOrder(snapshot);

      setMessage(
        `Order ${created.salesOrderNo} created with id ${created.id}. Current stage: ${toStageLabel(created.status)}.`,
      );
      setLineItems([INITIAL_LINE]);
      setMode("create");
    } catch (err) {
      setError(err.message || "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  }
console.log("Current Stage:", currentStage);
  const missingFields =
  currentStage === "ENGINEERING_REVIEW"
    ? getEngineeringMissingFields()
    : getPMMissingFields();
    console.log("missingFields:", missingFields);
    console.log("showErrors:", showErrors);

  return (
    <section className="surface">
      <div className="surface-header">
        <div>
          <h2>{mode === "edit" ? `Edit Order ${orderId}` : "Create Sales Order"}</h2>
          {mode === "edit" && <p>Loaded from dashboard route. Edit fields by stage ownership rules.</p>}
        </div>
      </div>

      {loadingOrder && <p className="muted-cell">Loading selected order...</p>}

      <WorkflowHeader
        salesOrder={workflowHeaderData.salesOrder}
        customerName={workflowHeaderData.customerName}
        currentStage={workflowHeaderData.currentStage}
        owner={workflowHeaderData.owner}
        lastUpdated={workflowHeaderData.lastUpdated}
        handleStageChange={handleStageChange}
        actionDisabled={{
          SUBMIT_ENGINEERING: !isPMReady(),
          APPROVE: !isEngineeringReady(),
        }}
        actionHandlers={{
          SUBMIT_ENGINEERING: handleSubmitForEngineering,
          APPROVE: handleEngineeringApproval,
        }}
      />

      {currentStage === "ENGINEERING_REVIEW" && (
        <p className="stage-action-hint stage-action-hint-engineering">Engineering action required</p>
      )}
     {currentStage === "DRAFT" && (
  <>
    <p className="stage-action-hint stage-action-hint-pm">
      PM action required
    </p>

    {showErrors && !isPMReady() && (
      <div style={{ marginBottom: "6px" }}>

         {/* Secondary info message */}
    <p style={{ color: "#555", marginTop: "2px" }}>
      {missingFields.length === 1
        ? "1 required field is missing:"
        : `${missingFields.length} required fields are missing:`}
    </p>

        {missingFields.length > 0 && (
          <div style={{ color: "#d32f2f", marginTop: "2px" }}>
            <ul style={{ margin: 0, paddingLeft: "18px", lineheight: "1.3" }}>
          
            
              {missingFields.map((field, index) => (
  <li key={index} style={{ marginBottom: "2px" }}>
  {typeof field === "string"
    ? field
    : `Line ${String(field.line + 1).padStart(3, "0")} → ${field.field}`
  }
</li>
))}
            </ul>
          </div>
        )}
      </div>
    )}
  </>
)}
      {currentStage === "ENGINEERING_REVIEW" && !isEngineeringReady() && (
        <p style={{ color: "#d32f2f" }}>Complete all engineering fields for all line items.</p>
      )}

      <form className="order-form" onSubmit={handleSubmit}>
        <div className="section-wrap" style={{ opacity: pmStageActive ? 1 : 0.7 }}>
          <div className="section-label-row">
            <span className="section-badge">PM Section</span>
            {!pmStageActive && <span className="section-lock-text">Read Only (PM stage completed)</span>}
          </div>

          <div className="form-grid">
            <label>
              Sales Order Number
              <input
                value={order.salesOrderNo}
                onChange={(event) => setOrder((prev) => ({ ...prev, salesOrderNo: event.target.value }))}
                placeholder="SO-012527"
                disabled={!canEditPMFields(currentStage)}
                required
                 style={{
    border: isFieldMissing("Sales Order Number")
      ? "1px solid #d32f2f"
      : ""
  }}
              />
            </label>
            <label>
              Division
              <select
                value={order.division}
                onChange={(event) => setOrder((prev) => ({ ...prev, division: event.target.value }))}
                disabled={!canEditPMFields(currentStage)}
              >
                <option value="OEM">OEM</option>
                <option value="AM">AM</option>
              </select>
            </label>
            <label>
              Customer Name
              <input
                value={order.customerName}
                onChange={(event) => setOrder((prev) => ({ ...prev, customerName: event.target.value }))}
                disabled={!canEditPMFields(currentStage)}
                required
                              style={{
    border: isFieldMissing("Customer Name")
      ? "1px solid #d32f2f"
      : ""
  }}
              />
            </label>
            <label>
              Customer PO
              <input
                value={order.customerPo}
                onChange={(event) => setOrder((prev) => ({ ...prev, customerPo: event.target.value }))}
                style={{
    border: isFieldMissing("Customer PO")
      ? "1px solid #d32f2f"
      : ""
  }}
              />
            </label>
            <label>
              Project Name
              <input
                value={order.projectName}
                onChange={(event) => setOrder((prev) => ({ ...prev, projectName: event.target.value }))}
              />
            </label>
            <label>
              Project Manager
              <input
                type="text"
                list="pm-list"
                value={order.projectManager || ""}
                onChange={(event) => setOrder((prev) => ({ ...prev, projectManager: event.target.value }))}
                onFocus={(event) => event.target.select()}
                placeholder="Select or enter Project Manager"
                disabled={!canEditPMFields(currentStage)}
                style={{
    border: isFieldMissing("Project Manager")
      ? "1px solid #d32f2f"
      : ""
  }}
              />
              <datalist id="pm-list">
                {projectManagers.map((pm, index) => (
                  <option key={index} value={pm} />
                ))}
              </datalist>
            </label>
            <label>
              Assigned Engineer
              <select
                value={order.assignedEngineer || ""}
                onChange={(event) => setOrder((prev) => ({ ...prev, assignedEngineer: event.target.value }))}
                disabled={!isPMEditable}
              >
                <option value="">Select Engineer</option>
                {engineers.map((eng) => (
                  <option key={eng.id} value={eng.name}>
                    {eng.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Submittal Date
              <input
                type="date"
                value={order.submittalDate}
                onChange={(event) => setOrder((prev) => ({ ...prev, submittalDate: event.target.value }))}
                disabled={!canEditPMFields(currentStage)}
              />
            </label>
            <label>
              Ship Date
              <input
                type="date"
                value={order.shipDate}
                onChange={(event) => setOrder((prev) => ({ ...prev, shipDate: event.target.value }))}
                disabled={!canEditPMFields(currentStage)}
              />
            </label>
          </div>
        </div>

        {lineItems.map((line, index) => (
          <div key={`${line.itemNo}-${index}`}>
            <div className="surface-header">
              <h3>Line Item {line.itemNo}</h3>
              {lineItems.length > 1 && (
                <button className="ghost-button" type="button" onClick={() => handleRemoveLineItem(index)}>
                  Remove
                </button>
              )}
            </div>
            <div className="form-grid">
              <label>
                Item No
                <input
                  value={line.itemNo}
                  onChange={(event) => updateLineItem(index, "itemNo", event.target.value)}
                  disabled={!canEditPMFields(currentStage)}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={line.description}
                  onChange={(event) => updateLineItem(index, "description", event.target.value)}
                  disabled={!isPMEditable}
                   style={{
  border: isFieldError(index, "description")
    ? "1px solid #d32f2f"
    : ""
}}
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(event) => updateLineItem(index, "quantity", event.target.value)}
                  disabled={!isPMEditable}
                  required
                  style={{
  border: isFieldError(index, "quantity")
    ? "1px solid #d32f2f"
    : ""
}}
                />
              </label>
              <label>
                Material
                <input
                  value={line.material}
                  onChange={(event) => updateLineItem(index, "material", event.target.value)}
                  disabled={!isPMEditable}
                />
              </label>
              <label>
                Part Number
                <input
  value={line.partNumber}
  onChange={(event) => updateLineItem(index, "partNumber", event.target.value)}
  disabled={!canEditPartNumberAndRevision(currentStage)}
  style={{
    border: isFieldError(index, "partNumber")
      ? "1px solid #d32f2f"
      : ""
  }}
/>
              </label>
              <label>
                Revision
                <input
  value={line.revision}
  onChange={(event) => updateLineItem(index, "revision", event.target.value)}
  disabled={!canEditPartNumberAndRevision(currentStage)}
  style={{
  border: isFieldError(index, "revision")
    ? "1px solid #d32f2f"
    : ""
}}
/>
              </label>
              <label>
                New Serial Number
                <input
                  value={line.newSerialNumber}
                  onChange={(event) => updateLineItem(index, "newSerialNumber", event.target.value)}
                  disabled={!canEditCommonFields(currentStage)}
                />
              </label>
              <label>
                Reference Serial Number
                <input
                  value={line.referenceSerialNumber}
                  onChange={(event) => updateLineItem(index, "referenceSerialNumber", event.target.value)}
                  disabled={!canEditPMFields(currentStage)}
                />
              </label>
            </div>

            <section className="tracking-group">
              <h5>Line Engineering</h5>
              <div className="tracking-grid">
                <label>
                  Drawing
                  <select
                    value={line.drawingStatus}
                    onChange={(event) => updateLineItem(index, "drawingStatus", event.target.value)}
                    disabled={!canEditEngineeringFields(currentStage)}
                  >
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                    <option value="NA">NA</option>
                  </select>
                </label>
                <label>
                  Rev Default In System
                  <select
                    value={line.revisionDefaultInSystem}
                    onChange={(event) => updateLineItem(index, "revisionDefaultInSystem", event.target.value)}
                    disabled={!canEditEngineeringFields(currentStage)}
                  >
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </label>
                <label>
                  PN/Rev Verified
                  <select
                    value={line.pnRevVerification}
                    onChange={(event) => updateLineItem(index, "pnRevVerification", event.target.value)}
                    disabled={!canEditEngineeringFields(currentStage)}
                  >
                    <option value="">Select status</option>
                    <option value="CORRECT">Correct</option>
                    <option value="REVISED">Revised</option>
                  </select>
                </label>
              </div>
            </section>
          </div>
        ))}

        <div className="form-actions">
          <button className="ghost-button" type="button" onClick={handleAddLineItem}>
            + Add Line Item
          </button>
        </div>

        <div className="section-wrap" style={{ opacity: engineeringStageActive ? 1 : 0.7 }}>
          <div className="section-label-row">
            <span className="section-badge">Engineering Section</span>
            {!engineeringStageActive && (
              <span className="section-lock-text">Locked - Waiting for Engineering stage</span>
            )}
          </div>

          <section className="tracking-group">
            <h3>Engineering Tracking (Order Level)</h3>
            <div className="tracking-grid">
              <label>
                Test Sheet
                <select
                  value={order.testSheetStatus}
                  onChange={(event) => setOrder((prev) => ({ ...prev, testSheetStatus: event.target.value }))}
                  disabled={!canEditEngineeringFields(currentStage)}
                >
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="NA">NA</option>
                </select>
              </label>
              <label>
                Tag
                <select
                  value={order.tagStatus}
                  onChange={(event) => setOrder((prev) => ({ ...prev, tagStatus: event.target.value }))}
                  disabled={!canEditEngineeringFields(currentStage)}
                >
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="NA">NA</option>
                </select>
              </label>
              <label>
                HMR
                <select
                  value={order.hmrStatus}
                  onChange={(event) => setOrder((prev) => ({ ...prev, hmrStatus: event.target.value }))}
                  disabled={!canEditHMR(currentStage)}
                >
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="NA">NA</option>
                </select>
              </label>
            </div>
          </section>
        </div>

        <div className="form-grid">
          <label className="wide">
            Notes
            <textarea
              value={lineItems[0]?.notes || order.notes || ""}
              onChange={(event) => {
                const value = event.target.value;
                setLineItems((prev) =>
                  prev.map((item, index) => (index === 0 ? { ...item, notes: value } : item)),
                );
                setOrder((prev) => ({ ...prev, notes: value }));
              }}
              rows="3"
            />
          </label>
        </div>

        <div className="form-actions">
          {mode === "create" ? (
            <button
              className="primary-button"
              disabled={submitting || !pmStageActive}
              style={{
                opacity: pmStageActive ? 1 : 0.5,
                cursor: pmStageActive ? (submitting ? "wait" : "pointer") : "not-allowed",
              }}
              title={!pmStageActive ? "Order already submitted" : ""}
              type="submit"
            >
              {submitting ? "Creating..." : "Create Order"}
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={submitting || !canUpdateOrder(currentStage)}
              style={{
                opacity: canUpdateOrder(currentStage) ? 1 : 0.5,
                cursor: canUpdateOrder(currentStage)
                  ? submitting
                    ? "wait"
                    : "pointer"
                  : "not-allowed",
              }}
              title={!canUpdateOrder(currentStage) ? "Order is read-only in this stage" : ""}
              type="submit"
            >
              {submitting ? "Updating..." : "Update Order"}
            </button>
          )}
        </div>
      </form>

      {message && <p className="ok-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
