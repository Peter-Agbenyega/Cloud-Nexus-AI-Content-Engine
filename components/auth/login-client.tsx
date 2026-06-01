"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [busy, setBusy] = useState<"idle" | "email" | "google">("idle");

  const isDisabled = busy !== "idle";

  async function handleEmailAuth() {
    setBusy("email");
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
        return;
      }
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage({ text: "Account created. Check your inbox if email confirmation is enabled.", isError: false });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Authentication failed.", isError: true });
    } finally {
      setBusy("idle");
    }
  }

  async function handleGoogleAuth() {
    setBusy("google");
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}${redirectTo}` },
      });
      if (error) throw error;
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Google sign-in failed.", isError: true });
      setBusy("idle");
    }
  }

  return (
    <div className="login-shell page-enter" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div className="login-wrap">
        <Link href="/" className="nav-logo" style={{ display: "block", marginBottom: "24px", textAlign: "center" }}>
          Cloud Nexus AI
        </Link>

        <div className="login-card">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
            Sign in to Cloud Nexus AI
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 22px" }}>
            Save campaigns and access your dashboard
          </p>

          <button
            type="button"
            onClick={() => void handleGoogleAuth()}
            disabled={isDisabled}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "9px",
              padding: "12px 16px", borderRadius: "10px", border: "1.5px solid var(--color-border)",
              background: "white", fontSize: "14px", fontWeight: 600, color: "#374151",
              cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.65 : 1,
              marginBottom: "16px", transition: "border-color 0.12s ease",
            }}
            className="hover:border-[var(--color-primary)]"
          >
            {busy === "google" ? <span className="spinner spinner-gray" aria-hidden="true" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "#f3f4f6" }} />
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#f3f4f6" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label htmlFor="auth-email" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>
                Email
              </label>
              <input
                id="auth-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input" placeholder="name@example.com" autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="auth-password" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "5px" }}>
                Password
              </label>
              <input
                id="auth-password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder="Minimum 6 characters"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
          </div>

          {message && (
            <div role="alert" style={{
              padding: "9px 12px", borderRadius: "7px", fontSize: "13px", marginBottom: "12px",
              background: message.isError ? "rgba(239,68,68,0.04)" : "rgba(16,185,129,0.04)",
              border: message.isError ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(16,185,129,0.25)",
              color: message.isError ? "var(--color-error)" : "var(--color-success)",
            }}>
              {message.text}
            </div>
          )}

          <button
            type="button" onClick={() => void handleEmailAuth()} disabled={isDisabled}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", minHeight: "46px", opacity: isDisabled ? 0.65 : 1, cursor: isDisabled ? "not-allowed" : "pointer" }}
          >
            {busy === "email" && <span className="spinner" aria-hidden="true" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>

          <p style={{ textAlign: "center", fontSize: "14px", color: "var(--color-text-secondary)", margin: "16px 0 0" }}>
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              style={{ background: "none", border: "none", padding: 0, color: "var(--color-primary)", fontWeight: 600, cursor: "pointer" }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
