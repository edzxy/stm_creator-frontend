import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./auth.css";              

export default function Login() {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);  

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGuest() {
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      await loginAsGuest();
      navigate(from, { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to continue as guest");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Use your account to continue</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="username"
          />

          <div className="auth-password">
            <input
              className="auth-input"
              style={{ flex: 1 }}
              type={show ? "text" : "password"}
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
            <button
              className="auth-eye"
              type="button"
              onClick={() => setShow((s) => !s)}
              disabled={loading}
              aria-pressed={show}
              title={show ? "Hide password" : "Show password"}
            >
              {show ? "🙈" : "👁️"}
            </button>
          </div>

          {err && <div className="auth-error">{err}</div>}

          <button
            className="auth-btn auth-btn-primary"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            className="auth-btn auth-btn-ghost"
            type="button"
            onClick={onGuest}
            disabled={loading}
          >
            {loading ? "Please wait..." : "Continue as Guest"}
          </button>
        </form>

        <div className="auth-tip">
          Tip: test account → <b>tern123@gmail.com</b> / <b>123456</b>
        </div>
      </div>
    </div>
  );
}
