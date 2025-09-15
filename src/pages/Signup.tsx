import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pwd !== pwd2) return setErr("Passwords do not match");
    try {
      await signup(name, email, pwd);
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e.message || "Signup failed");
    }
  };

  return (
    <div style={wrap}>
      <form onSubmit={submit} style={card}>
        <h2 style={{ marginBottom: 16 }}>Create account</h2>
        <label style={label}>Name</label>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
        <label style={label}>Email</label>
        <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        <label style={label}>Password</label>
        <input style={input} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        <label style={label}>Confirm Password</label>
        <input style={input} type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
        {err && <div style={errBox}>{err}</div>}
        <button style={btn} type="submit">Sign up</button>
        <p style={{ marginTop: 12 }}>
          Have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f7fb" };
const card: React.CSSProperties = { width: 360, background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.08)" };
const label: React.CSSProperties = { fontSize: 12, color: "#555", marginTop: 10 };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", outline: "none" };
const btn: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", marginTop: 14, cursor: "pointer", background: "#16a34a", color: "#fff", fontWeight: 600 };
const errBox: React.CSSProperties = { marginTop: 8, color: "#b91c1c", fontSize: 12 };
