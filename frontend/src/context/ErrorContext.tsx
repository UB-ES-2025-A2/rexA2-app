import { createContext, useContext, useState, ReactNode } from "react";
import ErrorPortal from "../components/ErrorPortal";

type ErrorContextType = {
  showError: (msg: string | Error | { detail?: string }) => void;
  hideError: () => void;
};

const ErrorContext = createContext<ErrorContextType>({
  showError: () => {},
  hideError: () => {},
});

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showError = (msg: string | Error | { detail?: string }) => {
    if (msg instanceof Error) setErrorMsg(msg.message);
    else if (typeof msg === "object" && "detail" in msg) setErrorMsg(msg.detail || "Error desconocido");
    else setErrorMsg(String(msg));
  };

  const hideError = () => setErrorMsg(null);

  return (
    <ErrorContext.Provider value={{ showError, hideError }}>
      {children}
      {errorMsg && (
        <ErrorPortal
          detail={errorMsg}
          onClose={hideError}
          autoHideMs={4000}
        />
      )}
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}
