import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import AlertPortal from "../components/Alert/AlertPortal";

type AlertType = "error" | "warning" | "success";

type AlertContextType = {
  showAlert: (msg: string | Error | { detail?: string }, type?: AlertType) => void;
  hideAlert: () => void;
};

const AlertContext = createContext<AlertContextType>({
  showAlert: () => { },
  hideAlert: () => { },
});

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{ message: string; type: AlertType } | null>(null);

  const showAlert = useCallback((msg: string | Error | { detail?: string }, type: AlertType = "error") => {
    let message = "Error desconocido";

    if (msg instanceof Error) message = msg.message;
    else if (typeof msg === "object" && "detail" in msg)
      message = msg.detail || "Error desconocido";
    else message = String(msg);

    setAlert({ message, type });
  }, []);

  const hideAlert = useCallback(() => setAlert(null), []);

  const value = useMemo(() => ({ showAlert, hideAlert }), [showAlert, hideAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      {alert && (
        <AlertPortal
          detail={alert.message}
          type={alert.type}
          onClose={hideAlert}
          autoHideMs={4000}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}
