import "./styles/App.css";
import Home from "./pages/Home";
import { AlertProvider } from "./context/AlertContext";

function App() {
  return (
    <AlertProvider>
      <Home />
    </AlertProvider>
  );
}

export default App;
