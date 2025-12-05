import "./styles/App.css";
import "./styles/tailwindstyles.css";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import { Routes, Route, Navigate } from "react-router-dom";
import { AlertProvider } from "./context/AlertContext";

function App() {
  return (
    <AlertProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/descubrir" replace />} />
        <Route path="/descubrir" element={<Discover />} />
        <Route path="/mapa" element={<Home />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/descubrir" replace />} />
      </Routes>
    </AlertProvider>
  );
}

export default App;
