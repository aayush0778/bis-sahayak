import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Sahayak@123");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Sign in to BIS Sahayak</h1>
      <p className="mt-1 text-sm text-slate-600">Chat, applicability checks and the complaint copilot need an account.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 focus:border-ink-700 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 focus:border-ink-700 focus:outline-none"
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-ink-800 py-2.5 font-semibold text-white hover:bg-ink-900 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 rounded-xl bg-ink-100/60 p-4 text-sm">
        <p className="font-medium text-ink-800">Quick demo access</p>
        <div className="mt-2 flex gap-2">
          <button onClick={() => fillDemo("business@demo.bis")} className="rounded bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-ink-50">
            Fill business demo
          </button>
          <button onClick={() => fillDemo("consumer@demo.bis")} className="rounded bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-ink-50">
            Fill consumer demo
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Both demo accounts use the password Sahayak@123.</p>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        No account?{" "}
        <Link to="/register" className="font-semibold text-ink-700 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
