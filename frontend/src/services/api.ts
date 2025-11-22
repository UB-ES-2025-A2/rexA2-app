import axios from "axios";

// Si hay VITE_API_URL la usa (por ejemplo en local),
// si no, usa el mismo origen desde donde se sirve la app (Azure).
const baseURL =
  import.meta.env.VITE_API_URL || window.location.origin;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getAccessToken(): string {
  return localStorage.getItem("access_token") || "";
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export default api;
