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

export default api;
