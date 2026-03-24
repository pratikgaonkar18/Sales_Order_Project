import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboard, searchOrders, toStageLabel } from "../api/ordersApi";
import StagePill from "../components/StagePill";
import { normalizeStage } from "../utils/stageUtils";

const EMPTY_FILTERS = {
  customerName: "",
  partNumber: "",
  salesOrderNo: "",
  referenceSerial: "",
};

const MOCK_ORDERS_KEY = "order-workflow-mock-orders";

function readMockOrders() {
  try {
    const raw = window.localStorage.getItem(MOCK_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hydrateOrdersWithLatestData(baseOrders) {
  const mockOrders = readMockOrders();

  return baseOrders.map((order) => {
    const snapshot = mockOrders.find(
      (item) =>
        String(item.id || "") === String(order.id || "") ||
        String(item.salesOrderNo || "") === String(order.salesOrderNo || ""),
    );

    const snapshotOrder = snapshot?.order || snapshot?.fullOrder || snapshot;
    const snapshotLine = snapshot?.line || snapshot?.fullOrder || snapshot;
    const snapshotFirstLine = Array.isArray(snapshot?.lineItems) ? snapshot.lineItems[0] : undefined;

    const mergedStage = normalizeStage(
      snapshotOrder?.currentStage ||
        snapshotOrder?.stage ||
        snapshotOrder?.status ||
        order.currentStage ||
        order.stage ||
        order.status,
    );

    const mergedOwner =
      snapshotOrder?.owner ||
      snapshotOrder?.currentOwnerRole ||
      order.owner ||
      order.currentOwnerRole;

    const mergedHmr =
      snapshotOrder?.hmrStatus ||
      snapshotOrder?.hmr ||
      snapshotLine?.hmrStatus ||
      snapshotLine?.hmr ||
      snapshotFirstLine?.hmrStatus ||
      snapshotFirstLine?.hmr ||
      snapshot?.hmrStatus ||
      order.engineeringTracking?.hmr ||
      order.hmr ||
      order.hmrStatus;

    return {
      ...order,
      currentStage: mergedStage,
      stage: mergedStage,
      status: mergedStage,
      owner: mergedOwner,
      currentOwnerRole: mergedOwner,
      stageUpdatedAt: snapshotOrder?.lastUpdated || snapshot?.updatedAt || order.stageUpdatedAt,
      engineeringTracking: {
        ...(order.engineeringTracking || {}),
        hmr: mergedHmr,
      },
      hmr: mergedHmr,
      hmrStatus: mergedHmr,
    };
  });
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function orderStatusClass(value) {
  const key = String(value || "Open").toUpperCase();
  if (key === "CLOSED") {
    return "order-status-pill order-status-closed";
  }
  if (key === "PENDING HMR") {
    return "order-status-pill order-status-pending-hmr";
  }
  return "order-status-pill order-status-open";
}

function getOrderStatus(order) {
  const currentStage = order.currentStage || order.stage || order.status;
  const stageNormalized = (currentStage || "")
    .toUpperCase()
    .replaceAll(" ", "_");
  const hmrNormalized = (
    order.hmrStatus ||
    order.engineeringTracking?.hmrStatus ||
    order.engineeringTracking?.hmr ||
    order.hmr ||
    ""
  ).toUpperCase();

  if (stageNormalized !== "RELEASED_TO_PRODUCTION") {
    return "Open";
  }

  if (stageNormalized === "RELEASED_TO_PRODUCTION") {
    if (hmrNormalized === "NO") {
      return "Pending HMR";
    }

    if (hmrNormalized === "YES" || hmrNormalized === "NA") {
      return "Closed";
    }
  }

  return "Open";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasSearchFilters = useMemo(
    () => Object.values(filters).some((value) => String(value).trim() !== ""),
    [filters],
  );

  const totalOrders = orders.length;
  const openOrders = useMemo(
    () => orders.filter((o) => getOrderStatus(o) === "Open").length,
    [orders],
  );
  const closedOrders = useMemo(
    () => orders.filter((o) => getOrderStatus(o) === "Closed").length,
    [orders],
  );
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const statusMatch = statusFilter === "ALL" || getOrderStatus(order) === statusFilter;
        const ownerValue = String(order.owner || order.currentOwnerRole || "").toUpperCase();
        const ownerMatch = ownerFilter === "ALL" || ownerValue === ownerFilter;
        return statusMatch && ownerMatch;
      }),
    [orders, statusFilter, ownerFilter],
  );

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDashboard(true);
      const latestOrders = hydrateOrdersWithLatestData(data);
      setOrders((prev) =>
        latestOrders.map((updatedOrder) => {
          const existingOrder = prev.find((o) => o.id === updatedOrder.id);
          return existingOrder ? { ...existingOrder, ...updatedOrder } : updatedOrder;
        }),
      );
    } catch (err) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await searchOrders(filters);
      const latestOrders = hydrateOrdersWithLatestData(data);
      setOrders((prev) =>
        latestOrders.map((updatedOrder) => {
          const existingOrder = prev.find((o) => o.id === updatedOrder.id);
          return existingOrder ? { ...existingOrder, ...updatedOrder } : updatedOrder;
        }),
      );
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setOwnerFilter("ALL");
    loadDashboard();
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    orders.forEach((order) => {
      console.log(order.currentStage);
    });
  }, [orders]);

  function openOrder(order) {
    if (!order?.id) {
      return;
    }
    navigate(`/order/${order.id}`, { state: { order } });
  }

  return (
    <section className="surface">
      <div className="surface-header">
        <div>
          <h2>Workflow Dashboard</h2>
          <p>Track stage, ownership, and waiting time across active orders.</p>
        </div>
        <button className="ghost-button" type="button" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      <form className="search-grid" onSubmit={runSearch}>
        <label>
          Customer
          <input
            value={filters.customerName}
            onChange={(event) => setFilters((prev) => ({ ...prev, customerName: event.target.value }))}
            placeholder="ABC Corp"
          />
        </label>
        <label>
          Part Number
          <input
            value={filters.partNumber}
            onChange={(event) => setFilters((prev) => ({ ...prev, partNumber: event.target.value }))}
            placeholder="92154-01"
          />
        </label>
        <label>
          Sales Order
          <input
            value={filters.salesOrderNo}
            onChange={(event) => setFilters((prev) => ({ ...prev, salesOrderNo: event.target.value }))}
            placeholder="SO-012527"
          />
        </label>
        <label>
          Reference Serial
          <input
            value={filters.referenceSerial}
            onChange={(event) => setFilters((prev) => ({ ...prev, referenceSerial: event.target.value }))}
            placeholder="001177-0101"
          />
        </label>
        <label>
          Filter by Owner
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="ALL">All</option>
            <option value="PM">PM</option>
            <option value="ENGINEERING">Engineering</option>
          </select>
        </label>
        <div className="search-actions">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Working..." : "Search"}
          </button>
          <button className="ghost-button" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </form>

      {error && <p className="error-text">{error}</p>}

      <section className="kpi-row" aria-label="Dashboard Summary">
        <button
          type="button"
          className={`kpi-card ${statusFilter === "ALL" ? "kpi-card-active" : ""}`}
          onClick={() => setStatusFilter("ALL")}
          aria-pressed={statusFilter === "ALL"}
        >
          <span className="kpi-label">Total Orders</span>
          <strong className="kpi-value">{totalOrders}</strong>
        </button>
        <button
          type="button"
          className={`kpi-card ${statusFilter === "Open" ? "kpi-card-active" : ""}`}
          onClick={() => setStatusFilter("Open")}
          aria-pressed={statusFilter === "Open"}
        >
          <span className="kpi-label">Open Orders</span>
          <strong className="kpi-value">{openOrders}</strong>
        </button>
        <button
          type="button"
          className={`kpi-card ${statusFilter === "Closed" ? "kpi-card-active" : ""}`}
          onClick={() => setStatusFilter("Closed")}
          aria-pressed={statusFilter === "Closed"}
        >
          <span className="kpi-label">Closed Orders</span>
          <strong className="kpi-value">{closedOrders}</strong>
        </button>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Division</th>
              <th>Stage</th>
              <th>Owner</th>
              <th>Days Waiting</th>
              <th>Stage Updated</th>
              <th>Reference Serial</th>
              <th className="status-divider">Order Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="10" className="muted-cell">
                  {hasSearchFilters ? "No matching orders found." : "No orders available yet."}
                </td>
              </tr>
            )}
            {filteredOrders.map((order) => {
              const computedOrderStatus = getOrderStatus(order);

              return (
                <tr key={order.id}>
                  <td>{order.salesOrderNo}</td>
                  <td>{order.customerName}</td>
                  <td>{order.division || "-"}</td>
                  <td>
                    <StagePill stage={order.stage || order.status || order.currentStage} />
                  </td>
                  <td>{toStageLabel(order.owner || order.currentOwnerRole || "") || "-"}</td>
                  <td>{order.daysWaiting ?? "-"}</td>
                  <td>{formatDateTime(order.stageUpdatedAt)}</td>
                  <td>{order.referenceSerialNumber || "-"}</td>
                  <td className="status-divider">
                    <span className={orderStatusClass(computedOrderStatus)}>{computedOrderStatus}</span>
                  </td>
                  <td>
                    <button className="ghost-button" type="button" onClick={() => openOrder(order)}>
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
