import { useState, useEffect, useMemo } from "react";
import TextField from "./TextField";
import PasswordField from "./PasswordField";
import {
  validateEmail,
  validateUsername,
  validatePassword,
  validateConfirmPassword,
  type FieldErrors,
} from "../utils/validation";
import { checkEmailAvailable, register, login, saveAuth } from "../services/auth";
import { useAuth } from "../context/AuthContext";
type Props = {
  mode?: "login" | "signup";
  onSwitchMode?: (mode: "login" | "signup") => void;
  onSubmit?: (values: Record<string, string>) => void; // hookéalas cuando conectes backend
};

type Touched = { email?: boolean; username?: boolean; password?: boolean; confirm?: boolean; };


export default function AuthCard({ mode = "login", onSwitchMode, onSubmit }: Props) {
  const [state, setState] = useState<Record<string, string>>({});

  const handle = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setState((s) => ({ ...s, [k]: e.target.value }));

  const auth = useAuth();

const submit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    if (mode === "signup") {
      // 1) Registro
      await register({
        email: state.email,
        username: state.username,
        password: state.password,
      });

      // 2) Login automático
      const authResp = await login({ email: state.email, password: state.password });
      saveAuth(authResp);
      auth.login({ user: authResp.user, token: authResp.access_token || "" }); // estado global


      // 3) Feedback mínimo sin cambiar tu UI
      alert("¡Usuario registrado y sesión iniciada!");
      onSubmit?.({ ...state, _autologin: true }); // <-- el padre cierra el modal
      return;
      
    }

    // ---- LOGIN normal ----
    const authResp = await login({ email: state.email, password: state.password });
    saveAuth(authResp);
    auth.login({ user: authResp.user, token: authResp.access_token || "" });

    alert("¡Sesión iniciada!");
    onSubmit?.(state);
  } catch (err: any) {
    alert(err?.message || "Error en autenticación");
  }
};



  return (
    <div className="auth">
      <div className="auth__avatar" aria-hidden="true">
        <div className="auth__avatar-ring" />
        <div className="auth__avatar-img">👤</div>
      </div>

      <h1 className="auth__title">{mode === "login" ? "Welcome back" : "Create account"}</h1>
      <p className="auth__subtitle">
        {mode === "login"
          ? "Sign in to continue"
          : "Join us in a few seconds"}
      </p>

      <form className="auth__form" onSubmit={submit} noValidate>
        {mode === "signup" && (
          <TextField label="Username" name="username" onChange={handle("username")} />
        )}
        <TextField label="Email" name="email" type="email" onChange={handle("email")} />
        <PasswordField label="Password" name="password" onChange={handle("password")} />
        {mode === "signup" && (
          <PasswordField
            label="Confirm password"
            name="confirm"
            onChange={handle("confirm")}
          />
        )}

        {mode === "login" && (
          <div className="auth__utils">
            <label className="auth__checkbox">
              <input type="checkbox" /> <span>Remember me</span>
            </label>
            <button type="button" className="auth__link">Forgot password?</button>
          </div>
        )}

        <button className="btn btn--primary" type="submit">
          {mode === "login" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <div className="auth__switch">
        {mode === "login" ? (
          <>
            Don’t have an account?{" "}
            <button className="auth__link" onClick={() => onSwitchMode?.("signup")}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button className="auth__link" onClick={() => onSwitchMode?.("login")}>
              Sign in
            </button>
          </>
        )}
      </div>

      <div className="auth__divider"><span>or</span></div>
      <div className="auth__socials">
        <button className="btn btn--ghost">Continue with Google</button>
        <button className="btn btn--ghost">Continue with GitHub</button>
      </div>
    </div>
  );
}
