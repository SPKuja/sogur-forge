"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    const payload = mode === "login"
      ? { login: data.get("login"), password: data.get("password") }
      : { username: data.get("username"), email: data.get("email"), password: data.get("password") };
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Something went wrong."); return; }
      router.push("/workspace"); router.refresh();
    } catch { setError("Sögur Forge could not reach the server."); }
    finally { setBusy(false); }
  }

  return <div className="auth-card">
    <div className="auth-brand"><span>S</span><div><strong>Sögur Forge</strong><small>Your stories. Forged here.</small></div></div>
    <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button></div>
    <form onSubmit={submit}>
      {mode === "register" && <><label>Username<input name="username" autoComplete="username" required minLength={3} maxLength={32} /></label><label>Email<input name="email" type="email" autoComplete="email" required /></label></>}
      {mode === "login" && <label>Username or email<input name="login" autoComplete="username" required /></label>}
      <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={12} /></label>
      {mode === "register" && <p className="auth-hint">Use at least 12 characters.</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
    </form>
    <p className="auth-foot">Private by design. Your manuscript stays tied to your account.</p>
  </div>;
}
