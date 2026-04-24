import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/lib/api";

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (signup) {
        await adminApi.signup(username.trim(), password);
      } else {
        await adminApi.login(username.trim(), password);
      }
      nav("/dashboard", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 360, background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Leftover Link – Admin</h1>
        <p style={{ margin: "0 0 24px", color: "#666", fontSize: 14 }}>
          {signup ? "Create admin account" : "Sign in to manage user requests"}
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              autoComplete={signup ? "new-password" : "current-password"}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" }}
            />
          </div>
          {err && <div style={{ color: "#b91c1c", fontSize: 14 }}>{err}</div>}
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "10px 16px",
              background: "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "..." : signup ? "Create admin" : "Login"}
          </button>
          <button
            type="button"
            onClick={() => { setSignup(!signup); setErr(null); }}
            style={{ background: "none", border: "none", color: "#0f766e", cursor: "pointer", fontSize: 14 }}
          >
            {signup ? "Already have an account? Login" : "Create first admin account"}
          </button>
        </form>
      </div>
    </div>
  );
}
