
import axios from "axios";

const api = axios.create({
  baseURL: "http://rex-htcsanc0b9fqhnb6.spaincentral-01.azurewebsites.net", // tu backend en Azure
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;