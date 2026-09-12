import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<"consumer" | "business">(params.get("role") === "consumer" ? "consumer" : "business");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({ email, password, role, businessName: role === "business" ? businessName : undefined });
      navigate(role === "business" ? "/applicability" : "/verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-2xl font-bold text-ink">Create your account</h1>
      <div className="mt-2 border-t border-paper-edge pt-2 text-sm text-ink-soft">
        Businesses get the applicability engine and radar watches; consumers get verification and complaint
        drafting.
      </div>

      <form onSubmit={onSubmit} className="mt-6 border border-paper-edge bg-white/60 p-6" noValidate>
        <fieldset>
          <legend className="text-sm font-medium text-ink">I am registering as a</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["business", "consumer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className={`border px-3 py-2 text-sm font-semibold capitalize ${
                  role === r
                    ? "border-navy bg-navy text-white"
                    : "border-paper-edge bg-white text-ink hover:bg-navy-wash"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>

        {role === "business" && (
          <div className="mt-4">
            <label htmlFor="businessName" className="block text-sm font-medium text-ink">
              Business name
            </label>
            <input
              id="businessName"
              autoComplete="organization"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-ink focus:border-navy focus:outline-none"
            />
          </div>
        )}
        <div className="mt-4">
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-paper-edge bg-paper px-3 py-2 text-ink focus:border-navy focus:outline-none"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="password" className="block text-sm font-medium text-ink">
            Password (min 8 characters)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {busy ? "Creating account…" : role === "business" ? "Create business account" : "Create consumer account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-navy underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
