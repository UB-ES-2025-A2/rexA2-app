import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "mapbox-gl/dist/mapbox-gl.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { UnitPreferenceProvider } from "./context/UnitPreferenceContext";

import "./styles/Auth.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <AuthProvider>
    <ThemeProvider>
      <UnitPreferenceProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UnitPreferenceProvider>
    </ThemeProvider>
  </AuthProvider>
);
