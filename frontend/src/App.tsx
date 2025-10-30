import "./styles/App.css";
import Home from "./pages/Home";
import { ErrorProvider } from "./context/ErrorContext";
import ErrorPortal from "./components/ErrorPortal";

function App() {
  return (
    <ErrorProvider>
      <Home />

      <ErrorPortal />
    </ErrorProvider>
  );
}

export default App;
