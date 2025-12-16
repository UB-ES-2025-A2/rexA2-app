import axios from "axios";

export const getApiBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL;

  if (typeof window !== "undefined") {
    console.log("[API-DEBUG] Raw VITE_API_URL:", envUrl, "Type:", typeof envUrl);
  }

  // Handle cases where envUrl is falsy OR is a string representation of undefined/null
  // Vite sometimes inlines "undefined" as a literal string instead of the primitive
  if (!envUrl ||
    (typeof envUrl === "string" &&
      (envUrl.trim().toLowerCase() === "undefined" ||
        envUrl.trim().toLowerCase() === "null" ||
        envUrl.trim() === ""))) {
    if (typeof window !== "undefined") {
      console.log("[API-DEBUG] No valid VITE_API_URL, falling back to origin:", window.location.origin);
      return window.location.origin;
    }
    return "";
  }

  // Sanitize: trim whitespace
  envUrl = envUrl.trim();

  // Sanitize: remove quotes if present (e.g. '"undefined"')
  if ((envUrl.startsWith('"') && envUrl.endsWith('"')) || (envUrl.startsWith("'") && envUrl.endsWith("'"))) {
    envUrl = envUrl.slice(1, -1);
  }

  // Re-check after quote removal for invalid string values
  const lower = envUrl.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "") {
    if (typeof window !== "undefined") {
      console.log("[API-DEBUG] Detected invalid URL value after quote removal, falling back to origin:", window.location.origin);
      return window.location.origin;
    }
    return "";
  }

  return envUrl;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
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

  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${path}`;

  // Debug logging para diagnosticar problemas de URL
  console.log("[fetchWithAuth] baseUrl:", baseUrl, "path:", path, "fullUrl:", fullUrl);

  return fetch(
    fullUrl,
    {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
    }
  );
}

export default api;
