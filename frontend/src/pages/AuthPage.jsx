import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const { user, login, signup } = useAuth();
  const location = useLocation();
  const from = location.state?.from || "/app";

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already logged in (or just logged in): send them inside
  if (user) return <Navigate to={from} replace />;

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isSignup) await signup(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-900 p-3 outline-none focus:border-purple-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-sm text-slate-400 hover:text-white">
          ← Home
        </Link>
        <h1 className="mt-3 text-2xl font-bold">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {isSignup && (
            <input
              name="name"
              value={form.name}
              onChange={change}
              placeholder="Name"
              className={input}
            />
          )}
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={change}
            placeholder="Email"
            className={input}
          />
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            placeholder="Password (at least 6 characters)"
            className={input}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-purple-600 py-3 font-medium hover:bg-purple-500 disabled:opacity-50"
          >
            {busy ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link
            to={isSignup ? "/login" : "/signup"}
            className="text-purple-400 hover:underline"
          >
            {isSignup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </div>
    </div>
  );
}