import { createPortal } from "react-dom";
import Alert from "./Alert";

export default function AlertPortal(props: React.ComponentProps<typeof Alert>) {
  if (typeof document === "undefined") return null;
  return createPortal(<Alert {...props} />, document.body);
}
