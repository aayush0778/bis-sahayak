import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export interface Slide {
  kicker: string;
  title: string;
  body: string;
  /** internal route ("/applicability") or in-page anchor ("#bis-videos") */
  href: string;
  cta: string;
}

const AUTO_ADVANCE_MS = 6000;

export default function Slideshow({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current || slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What BIS Sahayak does"
      className="border-b border-paper-edge bg-navy text-paper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative mx-auto h-96 max-w-6xl sm:h-80">
        {slides.map((s, i) => (
          <div
            key={s.title}
            aria-hidden={i !== index}
            className={`absolute inset-0 flex flex-col justify-center px-6 pb-10 transition-opacity duration-700 sm:px-10 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <p className="smallcaps text-xs font-semibold text-brass">{s.kicker}</p>
            <h2 className="mt-2 max-w-2xl font-serif text-2xl font-bold leading-snug sm:text-3xl">{s.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper/80">{s.body}</p>
            <p className="mt-4">
              {s.href.startsWith("/") ? (
                <Link
                  to={s.href}
                  tabIndex={i === index ? 0 : -1}
                  className="text-sm font-semibold text-brass underline underline-offset-4 hover:text-brass-deep"
                >
                  {s.cta} →
                </Link>
              ) : (
                <a
                  href={s.href}
                  tabIndex={i === index ? 0 : -1}
                  className="text-sm font-semibold text-brass underline underline-offset-4 hover:text-brass-deep"
                >
                  {s.cta} →
                </a>
              )}
            </p>
          </div>
        ))}

        <div className="absolute bottom-4 left-6 flex items-center gap-2 sm:left-10">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1} of ${slides.length}`}
              aria-current={i === index}
              className={`h-2.5 w-2.5 border border-paper/70 ${i === index ? "bg-brass" : "bg-transparent hover:bg-paper/40"}`}
            />
          ))}
        </div>
        <div className="absolute bottom-4 right-6 flex items-center gap-2 sm:right-10">
          <span aria-live="polite" className="smallcaps text-xs text-paper/60">
            {index + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="border border-paper/40 px-2.5 py-1 text-sm leading-none text-paper hover:bg-paper/10"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="border border-paper/40 px-2.5 py-1 text-sm leading-none text-paper hover:bg-paper/10"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
