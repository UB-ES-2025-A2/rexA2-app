import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import AuthCard from "../components/AuthCard";
import MapView from "../components/MapView";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, token, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const openAuth = (m: "login" | "signup" = "login") => {
    setMode(m);
    setOpen(true);
    setProfileMenuOpen(false);  // Cerrar el perfil si abrimos el login
  };

  const toggleProfileMenu = () => setProfileMenuOpen((v) => !v);

  useEffect(() => {
    if (user || token) {
      setProfileMenuOpen(false);  // Cierra el menú de perfil si ya está logeado
      setOpen(false);          // Cierra el modal de login/signup
    }
  }, [user, token]);

  return (
    <div className="home">
      <header className="home__header">
        <div className="brand">REX</div>
        <div className="profile-menu-container">
          <button
            className="profile-menu-btn"
            onClick={() => {
              if (user || token) {
                toggleProfileMenu();      // Si ya está logeado, muestra el menú
              } else {
                openAuth("login");        // Si no, abre el login
              }
            }}
            aria-label="Profile"
            aria-haspopup={user || token ? "menu" : undefined}
            aria-expanded={user || token ? profileMenuOpen : undefined}
          >
            <span>👤</span>
          </button>

          {user || token ? (  // Si hay usuario o token, mostramos el menú
            <div className={`profile-menu ${profileMenuOpen ? "open" : ""}`} role="menu" aria-label="Profile menu">
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  // Aquí puedes agregar la lógica para navegar al perfil
                  setProfileMenuOpen(false);
                }}
              >
                Mi perfil
              </button>
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  // Lógica para abrir ajustes, si tienes esa página
                  setProfileMenuOpen(false);
                }}
              >
                Ajustes
              </button>
              <button
                className="profile-menu__item"
                role="menuitem"
                onClick={() => {
                  logout();               // Limpiar sesión
                  setProfileMenuOpen(false); // Cerrar menú
                }}
              >
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="home__content">
        <div className="home__left-skeleton" />
        <div className="home__map-skeleton">
          <MapView
            className="home__map-skeleton"
            center={[2.1734, 41.3851]} // Barcelona
            zoom={11}
          />
        </div>
        <button
          className="fab"
          onClick={() => {
            // Modal rutas 
          }}
          title="Create route"
        >
          ＋
        </button>
      </main>

      <Modal open={open} onClose={() => setOpen(false)}>
        <AuthCard
          mode={mode}
          onSwitchMode={setMode}
          onSubmit={(values) => {
            setOpen(false);
            console.log("Submit", mode, values);
          }}
        />
      </Modal>
    </div>
  );
}
