import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import OrderFormPage from "./pages/OrderFormPage";
import "./App.css";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = location.pathname.startsWith("/order") ? "create" : "dashboard";

  return (
    <div className="app-shell">
      <header className="top-hero">
        <p className="eyebrow">Internal Workflow Tool</p>
        <h1>Sales Order Engineering Control Room</h1>
        <p className="subtitle">
          Replace spreadsheet handoffs with live status, searchable history, and accountable ownership.
        </p>
        <div className="tab-row">
          <button
            className={activeView === "dashboard" ? "tab-button tab-active" : "tab-button"}
            onClick={() => navigate("/dashboard")}
            type="button"
          >
            Dashboard
          </button>
          <button
            className={activeView === "create" ? "tab-button tab-active" : "tab-button"}
            onClick={() => navigate("/order")}
            type="button"
          >
            Create Order
          </button>
        </div>
      </header>

      <main className="content-wrap">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/order" element={<OrderFormPage />} />
          <Route path="/order/:orderId" element={<OrderFormPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
