import { useState } from "react";
import { C } from "../gelos_os/constants";
import { signIn, signUp } from "../lib/auth-client";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || "User",
        });
        if (error) setError(error.message ?? "Sign up failed");
      } else {
        const { error } = await signIn.email({ email, password });
        if (error) setError(error.message ?? "Sign in failed");
      }
    } catch (x: any) {
      setError(x?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(160deg, #f0f4f8 0%, #e8eef5 100%)",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 8px 40px rgba(26,60,94,.12)",
          padding: "32px 28px",
          border: "1px solid #e4eaf1",
        }}
      >
        <h1 style={{ margin: "0 0 6px", fontSize: "1.5rem", fontWeight: 800, color: C.primary }}>
          Gelos OS
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: ".95rem", color: "#64748b" }}>
          {mode === "signin" ? "Sign in to continue" : "Create an account"}
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: mode === "signin" ? `2px solid ${C.primary}` : "1px solid #dde3ea",
              background: mode === "signin" ? "rgba(26,60,94,.08)" : "#fff",
              fontWeight: 700,
              cursor: "pointer",
              color: C.primary,
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: mode === "signup" ? `2px solid ${C.primary}` : "1px solid #dde3ea",
              background: mode === "signup" ? "rgba(26,60,94,.08)" : "#fff",
              fontWeight: 700,
              cursor: "pointer",
              color: C.primary,
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: ".8rem", fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
                Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 12px",
                  borderRadius: 8,
                  border: "1px solid #dde3ea",
                  fontSize: "1rem",
                }}
              />
            </label>
          )}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: ".8rem", fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px 12px",
                borderRadius: 8,
                border: "1px solid #dde3ea",
                fontSize: "1rem",
              }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ display: "block", fontSize: ".8rem", fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
              Password
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px 12px",
                borderRadius: 8,
                border: "1px solid #dde3ea",
                fontSize: "1rem",
              }}
            />
          </label>

          {error && (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 8,
                background: "#fff5f5",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: ".9rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "none",
              borderRadius: 8,
              background: C.primary,
              color: "#fff",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={{ margin: "20px 0 0", fontSize: ".82rem", color: "#94a3b8", textAlign: "center" }}>
          Sessions are stored securely (HTTP-only cookies) via Better Auth + MongoDB.
        </p>
      </div>
    </div>
  );
}
