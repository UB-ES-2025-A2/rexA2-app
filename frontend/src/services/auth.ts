// frontend/src/services/auth.ts
const API = import.meta.env.VITE_API_URL || "";
// ---------- Helpers de almacenamiento ----------
export type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  user?: string;
};

export function saveAuth(auth: AuthResponse) {
  const token = auth.access_token;
  if (token) localStorage.setItem("access_token", token);
  if (auth.user) localStorage.setItem("user", JSON.stringify(auth.user));
}

export function getAccessToken() {
  return localStorage.getItem("access_token") || "";
}

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  try {
    //const res = await fetch(`${API}/users/check-email?email=${encodeURIComponent(email)}`);
    return true; // temporalmente desactivado
    if (!res.ok) return true; // no bloqueamos si hay fallo de red
    const data = await res.json();
    return !!data.available;
  } catch {
    return true;
  }
}

export async function register(payload: { email: string; username: string; password: string }) {
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Error ${res.status}`);
  }
  return res.json();
}


export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  // 1) Intento JSON típico
  const  res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
  /*
  // Fallback a ruta alternativa /login si /auth/login no existe
  if (res.status === 404) {
    res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: payload.email, password: payload.password }),
    });
  }

  // 2) Si tu backend espera form-data (OAuth2PasswordRequestForm)
  if (!res.ok && (res.status === 400 || res.status === 415 || res.status === 422)) {
    const form = new URLSearchParams({ username: payload.email, password: payload.password });
    res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) {
      res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
    }
  } */

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Error ${res.status}`);
  }
  const data = (await res.json()) as AuthResponse;
  return data;
}