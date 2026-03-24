const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function toStageLabel(stage) {
  return String(stage || "")
    .toLowerCase()
    .split("_")
    .map((part) => {
      if (part.length <= 3) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function buildUrl(path, params) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const rawUrl = isAbsolute ? path : `${API_BASE}${path}`;
  const url = new URL(rawUrl, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      url.searchParams.set(key, String(value).trim());
    }
  });
  if (!API_BASE) {
    return `${url.pathname}${url.search}`;
  }
  return `${url.toString()}`;
}

async function request(path, options = {}) {
  const { query, ...fetchOptions } = options;
  const response = await fetch(buildUrl(path, query), {
    headers: {
      "Content-Type": "application/json",
      ...(fetchOptions.headers || {}),
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      // Clone response so we can read the body multiple times if needed
      const clonedResponse = response.clone();
      const body = await clonedResponse.json();
      if (body.message) {
        message = body.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) {
          message = text;
        }
      } catch {
        // Ignore if we can't read body
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function fetchDashboard(openOnly = true) {
  return request("/api/orders/dashboard", { method: "GET", query: { openOnly } });
}

export async function searchOrders(filters) {
  return request("/api/orders/search", { method: "GET", query: filters });
}

export async function createOrder(payload) {
  return request("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchOrderById(orderId) {
  return request(`/api/orders/${orderId}`, { method: "GET" });
}

export { toStageLabel };
