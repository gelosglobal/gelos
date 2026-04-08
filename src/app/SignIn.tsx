import { useId, useState } from "react";
import { signIn, signUp } from "../lib/auth-client";

export function SignIn() {
  const baseId = useId();
  const emailId = `${baseId}-email`;
  const passwordId = `${baseId}-password`;
  const nameId = `${baseId}-name`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err } = await signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || "User",
        });
        if (err) setError(err.message ?? "Sign up failed");
      } else {
        const { error: err } = await signIn.email({ email, password });
        if (err) setError(err.message ?? "Sign in failed");
      }
    } catch (x: unknown) {
      setError(x instanceof Error ? x.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="gelos-auth-screen">
      <div className="gelos-auth-card">
        <header className="gelos-auth-brand">
          <div className="gelos-auth-logo" aria-hidden>
            G
          </div>
          <div>
            <h1 className="gelos-auth-title">
              <span>Gelos OS</span>
              {mode === "signin" ? "Welcome back" : "Create your workspace"}
            </h1>
            <p className="gelos-auth-lede">
              {mode === "signin"
                ? "Sign in with your work email to open dashboards and tools."
                : "Set up your account—same credentials work across DTC and Sales Force views."}
            </p>
          </div>
        </header>

        <div role="tablist" aria-label="Authentication mode" className="gelos-auth-tabs">
          <button
            type="button"
            role="tab"
            id={`${baseId}-tab-signin`}
            aria-selected={mode === "signin"}
            aria-controls={`${baseId}-panel-auth`}
            className="gelos-auth-tab"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            id={`${baseId}-tab-signup`}
            aria-selected={mode === "signup"}
            aria-controls={`${baseId}-panel-auth`}
            className="gelos-auth-tab"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
          >
            Register
          </button>
        </div>

        <form
          id={`${baseId}-panel-auth`}
          role="tabpanel"
          aria-labelledby={mode === "signin" ? `${baseId}-tab-signin` : `${baseId}-tab-signup`}
          onSubmit={submit}
        >
          {mode === "signup" && (
            <label className="gelos-auth-field" htmlFor={nameId}>
              <span className="gelos-auth-label">Display name</span>
              <input
                id={nameId}
                className="gelos-auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="e.g. Ama Owusu"
              />
            </label>
          )}
          <label className="gelos-auth-field" htmlFor={emailId}>
            <span className="gelos-auth-label">Work email</span>
            <input
              id={emailId}
              className="gelos-auth-input"
              type="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${baseId}-err` : undefined}
              placeholder="you@company.com"
            />
          </label>
          <label className="gelos-auth-field" htmlFor={passwordId}>
            <span className="gelos-auth-label">Password</span>
            <div className="gelos-auth-input-wrap">
              <input
                id={passwordId}
                className="gelos-auth-input gelos-auth-input--pw"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${baseId}-err` : undefined}
                placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              />
              <button
                type="button"
                className="gelos-auth-toggle-pw"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <div id={`${baseId}-err`} role="alert" aria-live="polite">
            {error ? <div className="gelos-auth-error">{error}</div> : null}
          </div>

          <button type="submit" className="gelos-auth-submit" disabled={loading}>
            {loading
              ? mode === "signin"
                ? "Signing you in…"
                : "Creating your account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="gelos-auth-foot">
          Secure session via HTTP-only cookies. Built with Better Auth and MongoDB.
        </p>
      </div>
    </main>
  );
}
