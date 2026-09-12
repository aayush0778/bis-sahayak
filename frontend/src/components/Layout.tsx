import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { HexSeal } from "./Seal";

const links = [
  { to: "/chat", label: "Ask Sahayak", auth: true },
  { to: "/applicability", label: "Applicability", auth: true },
  { to: "/radar", label: "QCO Radar", auth: false },
  { to: "/verify", label: "Verify a Mark", auth: false },
  { to: "/marks", label: "Know Your Mark", auth: false },
  { to: "/offices", label: "Offices & Labs", auth: false },
  { to: "/contact", label: "Help", auth: false },
  { to: "/complaints", label: "Complaints", auth: true },
  { to: "/dashboard", label: "Dashboard", auth: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:bg-paper focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="bg-navy-deep text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 border-b border-brass/60 px-4">
          <NavLink to="/" className="flex items-center gap-2.5">
            <HexSeal tone="brass" className="h-7 w-auto">
              IS
            </HexSeal>
            <span className="font-serif text-lg font-semibold tracking-tight">BIS Sahayak</span>
          </NavLink>
          <nav className="hidden items-center gap-0.5 text-sm text-white/80 lg:flex" aria-label="Primary">
            {links.map((l) =>
              l.auth && !user ? null : (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 hover:bg-white/10 ${isActive ? "bg-white/10 text-white underline decoration-brass underline-offset-8" : ""}`
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
                <span className="hidden text-white/70 sm:inline">
                  {user.email}
                  <span className="smallcaps ml-2 border border-white/25 px-1.5 py-0.5 text-xs text-brass">
                    {user.role}
                  </span>
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="border border-white/25 px-3 py-1.5 hover:bg-white/10"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="px-3 py-1.5 hover:bg-white/10">
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className="border border-brass px-3 py-1.5 font-medium text-brass hover:bg-brass hover:text-navy-deep"
                >
                  Get started
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-paper-edge bg-paper-deep">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed text-ink-soft">
          <p>
            <span className="font-serif font-semibold text-ink">BIS Sahayak</span> · Smart Automation ·
            Ministry of Consumer Affairs, Food &amp; Public Distribution (SIH26107). Not a government
            website — an assistant that cites official BIS sources.
          </p>
          <p className="mt-1">
            Helpline{" "}
            <a href="tel:1800111206" className="font-medium text-navy underline underline-offset-2">
              1800 11 1206
            </a>{" "}
            ·{" "}
            <a
              href="https://pgportal.gov.in"
              target="_blank"
              rel="noreferrer"
              className="text-navy underline underline-offset-2"
            >
              CPGRAMS grievances
            </a>{" "}
            · Always verify legally binding text in the Gazette.
          </p>
        </div>
      </footer>
    </div>
  );
}
