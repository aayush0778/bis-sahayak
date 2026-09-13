import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  async function signIn(email: string, password: string) {
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(from);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  // Read the DOM values at submit, not React state — password-manager autofill
  // writes straight into the inputs without firing onChange, so controlled
  // state can silently stay empty and fail the sign-in.
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await signIn(String(data.get("email") ?? "").trim(), String(data.get("password") ?? ""));
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-2xl font-bold text-ink">Sign in to BIS Sahayak</h1>
      <div className="mt-2 border-t border-paper-edge pt-2 text-sm text-ink-soft">
        Chat, applicability checks and the complaint copilot need an account.
      </div>

      <form onSubmit={onSubmit} className="mt-6 border border-paper-edge bg-white/60 p-6" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue=""
            className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-ink focus:border-navy focus:outline-none"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="password" className="block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            defaultValue=""
            className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-ink focus:border-navy focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="mt-4 border-l-2 border-signal bg-signal-wash px-3 py-2 text-sm text-signal">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full border border-navy bg-navy py-2.5 font-medium text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 border border-paper-edge bg-paper-deep p-4 text-sm">
        <p className="smallcaps font-semibold text-navy">One-click demo access</p>
        <p className="mt-1 text-xs text-ink-faint">Signs straight in — nothing to type, no autofill surprises.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void signIn("business@demo.bis", "Sahayak@123")}
            className="border border-navy/40 bg-white px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy-wash disabled:opacity-60"
          >
            Sign in as business demo
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signIn("consumer@demo.bis", "Sahayak@123")}
            className="border border-navy/40 bg-white px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy-wash disabled:opacity-60"
          >
            Sign in as consumer demo
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-faint">Both accounts use the password Sahayak@123.</p>
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        No account?{" "}
        <Link to="/register" className="font-semibold text-navy underline underline-offset-4">
          Register
        </Link>
      </p>
    </div>
  );
}
