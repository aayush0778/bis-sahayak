import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const features = [
  {
    title: "Applicability Engine",
    body: "Describe your product in plain language — get the applicable IS standards, the certification scheme, and whether a QCO makes certification mandatory right now.",
    href: "/applicability",
    cta: "Check my product",
  },
  {
    title: "Regulatory Change Radar",
    body: "A live-style feed of Quality Control Orders with effective dates. Watch a category and see instantly when a new order touches it.",
    href: "/radar",
    cta: "Open the radar",
  },
  {
    title: "Citation-grounded chat",
    body: "Ask anything about Indian Standards or QCOs. Every answer carries clickable citations back to the official BIS source — or a straight 'not on file'.",
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
    title: "Complaint Copilot",
    body: "Describe a defective certified product in plain text; get a properly structured complaint draft ready for BIS's official channel.",
    href: "/complaints",
    cta: "Draft a complaint",
  },
  {
    title: "Certification Journey",
    body: "Once a scheme is identified, the wizard explains the route: Scheme I vs CRS, what changed recently, and which concessions may apply to micro units.",
    href: "/applicability",
    cta: "Start the journey",
  },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div>
      <section className="bg-ink-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="mb-3 inline-block rounded-full border border-saffron-500/50 px-3 py-1 text-xs font-medium text-saffron-400">
            Smart Automation · SIH26107
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Your AI assistant for Indian Standards &amp; BIS services
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-200">
            23,000+ standards. Hundreds of Quality Control Orders. BIS Sahayak turns that maze into a straight
            answer — <em className="not-italic text-white">which standards apply to your product, and are they mandatory yet?</em>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link to="/dashboard" className="rounded-lg bg-saffron-500 px-5 py-3 font-semibold text-ink-900 hover:bg-saffron-400">
                Go to my dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register?role=business"
                  className="rounded-lg bg-saffron-500 px-5 py-3 font-semibold text-ink-900 hover:bg-saffron-400"
                >
                  I'm a business →
                </Link>
                <Link
                  to="/register?role=consumer"
                  className="rounded-lg border border-ink-200/40 px-5 py-3 font-semibold text-white hover:bg-ink-700"
                >
                  I'm a consumer →
                </Link>
                <Link to="/radar" className="rounded-lg px-5 py-3 font-medium text-ink-200 hover:text-white">
                  or browse the QCO radar first
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">What no BIS channel does today</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          Lookup apps ask you for a licence number. Catalogues match keywords. FAQ bots script answers. BIS
          Sahayak closes the loop: <strong>product → applicable standards → mandatory or voluntary → which scheme → what changed → next action</strong>.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">{f.body}</p>
              <Link to={f.href} className="mt-4 text-sm font-semibold text-ink-700 hover:text-ink-900">
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">Grounded, not guessing</h2>
              <p className="mt-3 text-slate-600">
                Every answer is retrieval-based over a curated corpus of BIS "Know Your Standards" metadata and
                real QCO notifications — with the IS number or order name cited inline. When the corpus doesn't
                contain the answer, Sahayak says so instead of improvising. In a compliance product, that
                behaviour is the product.
              </p>
            </div>
            <div className="rounded-xl bg-ink-50 p-5 text-sm text-slate-600">
              <p className="font-semibold text-ink-800">Demo accounts (seeded)</p>
              <ul className="mt-2 space-y-1">
                <li>
                  Business: <code className="rounded bg-white px-1.5 py-0.5">business@demo.bis</code> ·{" "}
                  <code className="rounded bg-white px-1.5 py-0.5">Sahayak@123</code>
                </li>
                <li>
                  Consumer: <code className="rounded bg-white px-1.5 py-0.5">consumer@demo.bis</code> ·{" "}
                  <code className="rounded bg-white px-1.5 py-0.5">Sahayak@123</code>
                </li>
              </ul>
              <p className="mt-3">
                Mark verification uses seeded sample records — the live BIS licence database is access-gated,
                which we state openly (data availability is a scope decision, never a gap).
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
