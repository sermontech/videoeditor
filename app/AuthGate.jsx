import React, { useState, useEffect } from "react";
import { Clapperboard, Loader2, LogOut } from "lucide-react";
import { cloudMode, supabase, authConfigurationError } from "./session";
export default function AuthGate({ children }) {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(cloudMode),
    [mode, setMode] = useState("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
        if (error) {
          setNotice(error.message);
          setFailed(true);
        }
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  if (!cloudMode) return children;
  if (authConfigurationError)
    return (
      <div className="boot">
        <h2>Cloud setup required</h2>
        <p>{authConfigurationError}</p>
      </div>
    );
  if (loading)
    return (
      <div className="boot">
        <Loader2 className="spin" />
        <p>Restoring your secure session…</p>
      </div>
    );
  if (session && mode !== "update")
    return (
      <React.Fragment key={session.user.id}>
        <div className="cloud-account">
          <span>{session.user.email}</span>
          <button
            onClick={async () => {
              if (!window.confirm("Sign out? Save any unsaved edits first."))
                return;
              const { error } = await supabase.auth.signOut();
              if (error) window.alert("Sign out failed. Please try again.");
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
        {children}
      </React.Fragment>
    );
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setFailed(false);
    try {
      let result;
      if (mode === "signin")
        result = await supabase.auth.signInWithPassword({ email, password });
      if (mode === "signup")
        result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
      if (mode === "reset")
        result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
      if (mode === "update")
        result = await supabase.auth.updateUser({ password });
      if (result?.error) throw result.error;
      if (mode === "signup")
        setNotice(
          "Check your email to confirm your account. The studio owner must also enable your Clear Take membership.",
        );
      if (mode === "reset")
        setNotice("If an account exists, a recovery email will be sent.");
      if (mode === "update") {
        setMode("signin");
        setNotice("Password updated.");
      }
      setPassword("");
    } catch (err) {
      setFailed(true);
      setNotice(err.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-logo">
          <span className="logo-mark">
            <Clapperboard size={20} />
          </span>
          clear take.
        </div>
        <div className="eyebrow">YOUR PRIVATE CREATOR STUDIO</div>
        <h1>
          {mode === "signin"
            ? "Welcome back."
            : mode === "signup"
              ? "Your next chapter."
              : mode === "update"
                ? "Choose a new password."
                : "Reset your password."}
        </h1>
        <p>Cloud projects, private media and a better take every time.</p>
        {mode !== "update" && (
          <label className="field">
            Email address
            <input
              autoFocus
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}
        {mode !== "reset" && (
          <label className="field">
            Password
            <input
              type="password"
              required
              minLength={mode === "signin" ? 1 : 10}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {notice && (
          <div role="status" className={"info-note " + (failed ? "error" : "")}>
            {notice}
          </div>
        )}
        <button className="btn primary full" disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : null}
          {
            {
              signin: "Sign in",
              signup: "Create account",
              reset: "Send recovery email",
              update: "Update password",
            }[mode]
          }
        </button>
        <div className="auth-links">
          {mode !== "signin" && (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setMode("signin");
                setNotice("");
              }}
            >
              Back to sign in
            </button>
          )}
          {mode === "signin" && (
            <>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setMode("signup");
                  setNotice("");
                }}
              >
                Create an account
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setMode("reset");
                  setNotice("");
                }}
              >
                Forgot password?
              </button>
            </>
          )}
        </div>
        <small>
          Email confirmation and an invitation are required. Both apps share
          this project's Supabase sign-in accounts.
        </small>
      </form>
    </div>
  );
}
