import { Routes, Route } from 'react-router-dom';
import Register from './pages/Register.tsx';
import Login from './pages/Login';
import Explore from './pages/Explore';

function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/explore" element={<Explore />} />
      {/* Ruta por defecto o redirección según convenga */}
    </Routes>
  );
}
export default App;
