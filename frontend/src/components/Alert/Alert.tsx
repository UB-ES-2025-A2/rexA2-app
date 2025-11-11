import React, { useEffect } from "react";
import "../../styles/Alert.css";

type Detail = string | { detail?: string } | Error | null | undefined;
export type AlertType = "error" | "warning" | "success";

function toMessage(detail: Detail): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (detail instanceof Error) return detail.message || "Error";
  if (typeof detail === "object" && "detail" in detail) {
    const d = (detail as any).detail;
    if (typeof d === "string") return d;
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return "Error";
  }
}

export type AlertProps = {
  detail?: Detail;
  type?: AlertType;
  onClose?: () => void;
  autoHideMs?: number;
};

const Alert: React.FC<AlertProps> = ({
  detail,
  type = "error",
  onClose,
  autoHideMs = 4000,
}) => {
  const message = toMessage(detail);

  useEffect(() => {
    if (!autoHideMs || !message) return;
    const t = setTimeout(() => onClose?.(), autoHideMs);
    return () => clearTimeout(t);
  }, [autoHideMs, message, onClose]);

  if (!message) return null;

  // ✅ dinámicamente aplicamos la clase según el tipo
  return (
    <div role="alert" aria-live="assertive" className="error-toast-container">
      <div className={type}>
        <div className={`${type}__icon`}>
          {/* Iconos distintos según tipo */}
          {type === "error" && (
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86l-7.17 12.42A1 1 0 004 18h16a1 1 0 00.86-1.58L13.71 3.86a1 1 0 00-1.72 0z"
                stroke="#ef4444"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          )}
          {type === "warning" && (
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86l-7.17 12.42A1 1 0 004 18h16a1 1 0 00.86-1.58L13.71 3.86a1 1 0 00-1.72 0z"
                stroke="#f59e0b"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          )}
          {type === "success" && (
            <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
              <path
                d="M9 12l2 2 4-4"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          )}
        </div>

        <div className={`${type}__title`}>{message}</div>

        <div className={`${type}__close`} onClick={onClose}>
          <svg height="20" viewBox="0 0 20 20" width="20">
            <path
              d="m15.8333 5.34166-1.175-1.175-4.6583 4.65834-4.65833-4.65834-1.175 1.175 
              4.65833 4.65834-4.65833 4.6583 1.175 1.175 
              4.65833-4.6583 4.6583 4.6583 
              1.175-1.175-4.6583-4.6583z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Alert;
