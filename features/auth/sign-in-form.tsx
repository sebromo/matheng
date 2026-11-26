"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "./auth-client";

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");
    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({ email, password, name })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setMessage(result.error.message ?? "Unable to authenticate");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Unable to reach Forma. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Link className="auth-brand" href="/" aria-label="Forma home">
          <span className="brand-mark">f</span>
          <span className="brand-name">forma</span>
        </Link>
        <p className="auth-kicker">ENGINEERING WORKSHEETS</p>
        <h1>
          {mode === "sign-in" ? "Sign in to Forma" : "Create your account"}
        </h1>
        <form onSubmit={submit}>
          {mode === "sign-up" && (
            <label>
              Name
              <input name="name" autoComplete="name" required maxLength={120} />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          {message && (
            <p className="auth-error" role="alert">
              {message}
            </p>
          )}
          <button type="submit" disabled={busy}>
            {busy
              ? "Working..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMessage("");
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          }}
        >
          {mode === "sign-in"
            ? "New to Forma? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </section>
      <div className="auth-paper" aria-hidden="true">
        <span>σ =</span>
        <span className="auth-fraction">
          T r<small>J</small>
        </span>
        <i />
      </div>
    </main>
  );
}
