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
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">Businesses get the applicability engine and radar watches; consumers get verification and complaint drafting.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {(["business", "consumer"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${
                role === r ? "border-ink-800 bg-ink-800 text-white" : "border-ink-200 bg-white hover:bg-ink-50"
              }`}
            >
              I'm a {r}
            </button>
          ))}
        </div>

        {role === "business" && (
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium">
              Business name
            </label>
            <input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 focus:border-ink-700 focus:outline-none"
            />
          </div>
        )}
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
            Password (min 8 characters)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
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
          {busy ? "Creating account…" : role === "business" ? "Create business account" : "Create consumer account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-ink-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
