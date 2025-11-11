import './styles/App.css'
import Home from './pages/Home'
import Profile from './pages/Profile'
import { Routes, Route } from 'react-router-dom';
import { AlertProvider } from "./context/AlertContext";


function App() {
  return (
    <AlertProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/perfil" element={<Profile />} />
      </Routes>
    </AlertProvider>
  );
}


export default App;
