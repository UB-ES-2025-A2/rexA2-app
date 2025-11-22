import React, { useState } from "react";
import "../../styles/DeleteRouteModal.css";
import Modal from "../Modal";
import Alert from "../Alert/Alert";

interface DeleteRouteModalProps {
  open: boolean;
  routeName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

type Status = "idle" | "loading" | "error" | "success";

const DeleteRouteModal: React.FC<DeleteRouteModalProps> = ({
  open,
  routeName,
  onConfirm,
  onCancel,
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleConfirm = async () => {
    setStatus("loading");
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await onConfirm();
      setStatus("success");
      setSuccessMessage(
        `La ruta "${routeName}" ha sido eliminada correctamente.`
      );
      setTimeout(() => {
        onCancel();
        setStatus("idle");
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error al eliminar la ruta"
      );
    }
  };

  const handleClose = () => {
    if (status !== "loading") {
      setStatus("idle");
      setErrorMessage("");
      setSuccessMessage("");
      onCancel();
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <div className="delete-route-modal">
          {status === "idle" && (
            <div className="delete-route-modal__content">
              <div className="delete-route-modal__icon delete-route-modal__icon--warning">
                ⚠️
              </div>
              <h2 className="delete-route-modal__title">Eliminar ruta</h2>
              <p className="delete-route-modal__message">
                ¿Estás seguro de que deseas eliminar la ruta{" "}
                <strong>"{routeName}"</strong>?
              </p>
              <p className="delete-route-modal__warning">
                Esta acción no se puede deshacer.
              </p>
              <div className="delete-route-modal__actions">
                <button
                  onClick={handleClose}
                  className="delete-route-modal__btn delete-route-modal__btn--cancel"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="delete-route-modal__btn delete-route-modal__btn--delete"
                >
                  Eliminar ruta
                </button>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="delete-route-modal__content">
              <div className="delete-route-modal__spinner"></div>
              <p className="delete-route-modal__message">
                Eliminando la ruta...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="delete-route-modal__content">
              <div className="delete-route-modal__icon delete-route-modal__icon--success">
                ✓
              </div>
              <h2 className="delete-route-modal__title">¡Ruta eliminada!</h2>
              <p className="delete-route-modal__message">
                La ruta <strong>"{routeName}"</strong> ha sido eliminada
                correctamente.
              </p>
              <p
                className="delete-route-modal__message"
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                  marginTop: "0.5rem",
                }}
              >
                Se cerrará automáticamente en 3 segundos...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="delete-route-modal__content">
              <div className="delete-route-modal__icon delete-route-modal__icon--error">
                ✕
              </div>
              <h2 className="delete-route-modal__title">Error al eliminar</h2>
              <p className="delete-route-modal__message">{errorMessage}</p>
              <div className="delete-route-modal__actions">
                <button
                  onClick={handleRetry}
                  className="delete-route-modal__btn delete-route-modal__btn--retry"
                >
                  Volver a intentar
                </button>
                <button
                  onClick={handleClose}
                  className="delete-route-modal__btn delete-route-modal__btn--cancel"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {successMessage && (
        <Alert
          detail={successMessage}
          type="success"
          onClose={() => setSuccessMessage("")}
          autoHideMs={3000}
        />
      )}
    </>
  );
};

export default DeleteRouteModal;