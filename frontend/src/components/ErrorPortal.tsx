import { createPortal } from "react-dom";
import ErrorAlert from "./ErrorAlert";

export default function ErrorPortal(props: React.ComponentProps<typeof ErrorAlert>) {
  if (typeof document === "undefined") return null;
  return createPortal(<ErrorAlert {...props} />, document.body);
}
