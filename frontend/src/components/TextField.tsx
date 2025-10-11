import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export default function TextField({ label, error, ...rest }: Props) {
  const id = rest.id || rest.name || crypto.randomUUID();
  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <input id={id} placeholder=" " {...rest} className="field__input" />
      <label htmlFor={id} className="field__label">{label}</label>
      {error && <small className="field__error">{error}</small>}
    </div>
  );
}
