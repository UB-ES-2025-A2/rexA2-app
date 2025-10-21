//import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import App from './App';
import { AuthProvider } from './context/AuthContext'; 

//import Home from './pages/Home';
import './styles/Auth.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <AuthProvider>               
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>
);
