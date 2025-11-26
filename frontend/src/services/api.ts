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

// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getAccessToken(): string {
  return localStorage.getItem("access_token") || "";
}

export async function fetchWithAuth(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const token =
    localStorage.getItem("access_token") ||
    (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token && typeof token === "string") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const requestBody = options?.body;
  if (
    requestBody &&
    typeof requestBody === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(
    `${import.meta.env.VITE_API_URL || window.location.origin}${path}`,
    {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
    }
  );
}

export default api;
