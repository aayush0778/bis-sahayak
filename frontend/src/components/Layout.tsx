import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const links = [
  { to: "/chat", label: "Ask Sahayak", auth: true },
  { to: "/applicability", label: "Applicability Wizard", auth: true },
  { to: "/radar", label: "Regulatory Radar", auth: false },
  { to: "/verify", label: "Verify a Mark", auth: false },
  { to: "/complaints", label: "Complaint Copilot", auth: true },
  { to: "/dashboard", label: "Dashboard", auth: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-ink-800 text-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded bg-saffron-500 text-ink-900 font-bold text-sm">BIS</span>
            <span>BIS Sahayak</span>
          </NavLink>
          <nav className="hidden md:flex items-center gap-1 text-sm text-ink-200">
            {links.map((l) =>
              l.auth && !user ? null : (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `rounded px-3 py-1.5 hover:bg-ink-700 ${isActive ? "bg-ink-700 text-white" : ""}`
                  }
                >
                  {l.label}
                </NavLink>
              ),
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="hidden sm:inline text-ink-200">
                  {user.email}
                  <span className="ml-2 rounded bg-ink-700 px-1.5 py-0.5 text-xs uppercase tracking-wide text-saffron-400">
                    {user.role}
                  </span>
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="rounded border border-ink-200/30 px-3 py-1.5 hover:bg-ink-700"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="rounded px-3 py-1.5 hover:bg-ink-700">
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded bg-saffron-500 px-3 py-1.5 font-medium text-ink-900 hover:bg-saffron-400"
                >
                  Get started
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-100 bg-white py-4 text-center text-xs text-slate-500">
        BIS Sahayak · Smart Automation · Ministry of Consumer Affairs, Food & Public Distribution (SIH26107) ·
        Answers cite BIS sources; always verify legally binding text in the Gazette.
      </footer>
    </div>
  );
}
