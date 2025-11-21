import type React from "react";
import { useState } from "react";
import TextField from "./TextField";
import PasswordField from "./PasswordField";
import {
  validateEmail,
  validateUsername,
  validatePassword,
  validateConfirmPassword,
  type FieldErrors,
} from "../utils/validation";
import { register, login, saveAuth } from "../services/auth";
import { useAuth } from "../context/AuthContext";

type Props = {
  mode?: "login" | "signup";
  onSwitchMode?: (mode: "login" | "signup") => void;
  onSubmit?: (values: Record<string, string>) => void;
};

type Touched = {
  email?: boolean;
  username?: boolean;
  password?: boolean;
  confirm?: boolean;
};

export default function AuthCard({
  mode = "login",
  onSwitchMode,
  onSubmit,
}: Props) {
  const [state, setState] = useState({
    email: "",
    username: "",
    password: "",
    confirm: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const auth = useAuth();

  const validators = {
    email: validateEmail,
    username: validateUsername,
    password: validatePassword,
    confirm: (value: string) => validateConfirmPassword(state.password, value),
  } as const;

  const handle =
    (field: keyof typeof state) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setState((s) => ({ ...s, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: validators[field]?.(value) }));

      if (field === "password" && mode === "signup" && state.confirm) {
        setErrors((prev) => ({
          ...prev,
          confirm: validateConfirmPassword(value, state.confirm),
        }));
      }
    };

  const handleBlur = (field: keyof typeof state) => () =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    const currentErrors: FieldErrors = {
      email: validateEmail(state.email),
      password: validatePassword(state.password),
    };
    if (mode === "signup") {
      currentErrors.username = validateUsername(state.username);
      currentErrors.confirm = validateConfirmPassword(
        state.password,
        state.confirm
      );
    }

    const hasErrors = Object.values(currentErrors).some(Boolean);
    if (hasErrors) {
      setErrors((prev) => ({ ...prev, ...currentErrors }));
      setTouched((prev) => ({
        ...prev,
        email: true,
        password: true,
        ...(mode === "signup" ? { username: true, confirm: true } : {}),
      }));
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === "signup") {
        // 1) Registro
        await register({
          email: state.email,
          username: state.username,
          password: state.password,
        });

        // 2) Login automático
        const authResp = await login({
          email: state.email,
          password: state.password,
        });

        // [DEBUG] ver exactamente qué devuelve el backend
        console.log("[AUTHCARD][signup] login response", authResp);
        console.log("[AUTHCARD][signup] authResp.user", authResp?.user);
        console.log(
          "[AUTHCARD][signup] authResp.access_token",
          authResp?.access_token
        );

        saveAuth(authResp);

        auth.login({
          user: authResp.user,
          token: authResp.access_token || "",
        });

        console.log("[AUTHCARD][signup] after auth.login");

        onSubmit?.({ ...state, _autologin: "true" });
        return;
      }

      // Login normal
      const authResp = await login({
        email: state.email,
        password: state.password,
      });

      // [DEBUG] ver exactamente qué devuelve el backend
      console.log("[AUTHCARD][login] login response", authResp);
      console.log("[AUTHCARD][login] authResp.user", authResp?.user);
      console.log(
        "[AUTHCARD][login] authResp.access_token",
        authResp?.access_token
      );

      saveAuth(authResp);

      auth.login({
        user: authResp.user,
        token: authResp.access_token || "",
      });

      console.log("[AUTHCARD][login] after auth.login");

      onSubmit?.(state);
    } catch (err: any) {
      if (mode === "signup" && err?.status === 409) {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("email")) {
          setErrors((prev) => ({ ...prev, email: err.message }));
          setTouched((prev) => ({ ...prev, email: true }));
        } else if (msg.includes("usuario") || msg.includes("username")) {
          setErrors((prev) => ({ ...prev, username: err.message }));
          setTouched((prev) => ({ ...prev, username: true }));
        } else {
          setFormError(err?.message || "No se pudo completar el registro.");
        }
      } else {
        setFormError(err?.message || "No se pudo completar la autenticación.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__avatar" aria-hidden="true">
        <div className="auth__avatar-ring" />
        <div className="auth__avatar-img">👤</div>
      </div>

      <h1 className="auth__title">
        {mode === "login" ? "Welcome back" : "Create account"}
      </h1>
      <p className="auth__subtitle">
        {mode === "login" ? "Sign in to continue" : "Join us in a few seconds"}
      </p>

      <form className="auth__form" onSubmit={submit} noValidate>
        {mode === "signup" && (
          <TextField
            label="Username"
            name="username"
            value={state.username}
            onChange={handle("username")}
            onBlur={handleBlur("username")}
            error={touched.username ? errors.username : undefined}
          />
        )}

        <TextField
          label="Email"
          name="email"
          type="email"
          value={state.email}
          onChange={handle("email")}
          onBlur={handleBlur("email")}
          error={touched.email ? errors.email : undefined}
        />

        <PasswordField
          label="Password"
          name="password"
          value={state.password}
          onChange={handle("password")}
          onBlur={handleBlur("password")}
          error={touched.password ? errors.password : undefined}
        />

        {mode === "signup" && (
          <PasswordField
            label="Confirm password"
            name="confirm"
            value={state.confirm}
            onChange={handle("confirm")}
            onBlur={handleBlur("confirm")}
            error={touched.confirm ? errors.confirm : undefined}
          />
        )}

        <button
          className="btn btn--primary"
          type="submit"
          disabled={isSubmitting || Object.values(errors).some(Boolean)}
        >
          {isSubmitting ? "…" : mode === "login" ? "Sign in" : "Sign up"}
        </button>

        {formError && (
          <p className="auth__form-error" role="alert">
            {formError}
          </p>
        )}
      </form>

      <div className="auth__switch">
        {mode === "login" ? (
          <>
            Don’t have an account?{" "}
            <button
              className="auth__link"
              onClick={() => onSwitchMode?.("signup")}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              className="auth__link"
              onClick={() => onSwitchMode?.("login")}
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
