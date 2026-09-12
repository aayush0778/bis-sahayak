import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { HexSeal } from "../components/Seal";

const features = [
  {
    title: "Applicability Engine",
    body: "Describe your product in plain language — get the applicable IS standards, the certification scheme, and whether a QCO makes certification mandatory right now.",
    href: "/applicability",
    cta: "Check my product",
  },
  {
    title: "Regulatory Change Radar",
    body: "Quality Control Orders on a gazette-style timeline with effective dates. Watch a category and see instantly when a new order touches it.",
    href: "/radar",
    cta: "Open the radar",
  },
  {
    title: "Citation-grounded chat",
    body: "Ask anything about Indian Standards or QCOs. Every answer carries clickable citations to the official BIS source — or a straight \u2018not on file\u2019.",
    href: "/chat",
    cta: "Ask Sahayak",
  },
  {
    title: "Verify a Mark",
    body: "Look up a CM/L licence, jewellery HUID, or CRS registration number — one tool among many, not the whole product.",
    href: "/verify",
    cta: "Verify a number",
  },
  {
    title: "Know Your Mark",
    body: "What the ISI mark, BIS hallmark and CRS registration actually look like — and what each part of them means for you as a buyer.",
    href: "/marks",
    cta: "Read the marks",
  },
  {
    title: "Offices, Labs & Helpline",
    body: "Every BIS branch office, regional office and laboratory on a map, with the national helpline and CPGRAMS hand-off for formal grievances.",
    href: "/offices",
    cta: "Find an office",
  },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div>
      <section className="border-b border-paper-edge">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-center gap-3">
            <HexSeal tone="brass" className="h-10 w-auto" />
            <p className="smallcaps text-sm text-ink-soft">
              Smart Automation · SIH26107 · Ministry of Consumer Affairs, Food &amp; Public Distribution
            </p>
          </div>
          <h1 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Your AI assistant for Indian Standards &amp; BIS services
          </h1>
          <div className="mt-5 max-w-2xl border-l-2 border-brass pl-5 text-lg leading-relaxed text-ink-soft">
            <p>
              23,000+ standards. Hundreds of Quality Control Orders. BIS Sahayak turns that maze into a
              straight answer: which standards apply to your product, and are they mandatory yet?
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="border border-navy bg-navy px-5 py-2.5 font-medium text-white hover:bg-navy-deep"
              >
                Go to my dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register?role=business"
                  className="border border-navy bg-navy px-5 py-2.5 font-medium text-white hover:bg-navy-deep"
                >
                  I'm a business →
                </Link>
                <Link
                  to="/register?role=consumer"
                  className="border border-navy px-5 py-2.5 font-medium text-navy hover:bg-navy-wash"
                >
                  I'm a consumer →
                </Link>
                <Link to="/radar" className="text-navy underline underline-offset-4 hover:text-navy-deep">
                  or browse the QCO radar first
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="bg-paper-deep">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-serif text-2xl font-bold text-ink">What no BIS channel does today</h2>
          <div className="mt-3 max-w-3xl border-t border-paper-edge pt-3 text-slate-600">
            <p>
              Lookup apps ask you for a licence number. Catalogues match keywords. FAQ bots script answers.
              BIS Sahayak closes the loop: product → applicable standards → mandatory or voluntary → which
              scheme → what changed → next action.
            </p>
          </div>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="border-t-2 border-navy/70 pt-4">
                <div className="flex items-center gap-2">
                  <HexSeal className="h-5 w-auto" />
                  <h3 className="font-serif text-lg font-semibold text-ink">{f.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
                <Link
                  to={f.href}
                  className="mt-3 inline-block text-sm font-semibold text-navy underline underline-offset-4 hover:text-navy-deep"
                >
                  {f.cta} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-paper-edge">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">Grounded, not guessing</h2>
              <div className="mt-3 border-t border-paper-edge pt-3">
                <p className="text-slate-600">
                  Every answer is retrieval-based over a curated corpus of BIS "Know Your Standards" metadata
                  and real QCO notifications — with the IS number or order name cited inline. When the corpus
                  doesn't contain the answer, Sahayak says so instead of improvising. In a compliance product,
                  that behaviour is the product.
                </p>
              </div>
            </div>
            <div className="border border-paper-edge bg-paper p-5">
              <p className="smallcaps text-sm font-semibold text-navy">Demo accounts (seeded)</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                <li>
                  Business: <code className="bg-paper-deep px-1.5 py-0.5">business@demo.bis</code> ·{" "}
                  <code className="bg-paper-deep px-1.5 py-0.5">Sahayak@123</code>
                </li>
                <li>
                  Consumer: <code className="bg-paper-deep px-1.5 py-0.5">consumer@demo.bis</code> ·{" "}
                  <code className="bg-paper-deep px-1.5 py-0.5">Sahayak@123</code>
                </li>
              </ul>
              <p className="mt-3 border-t border-paper-edge pt-3 text-xs leading-relaxed text-ink-faint">
                Mark verification uses seeded sample records — the live BIS licence database is access-gated,
                which we state openly. Office, lab and helpline data is sourced from bis.gov.in with per-row
                source links.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
