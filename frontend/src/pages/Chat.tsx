import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, type ChatMessage, type ChatSession, type CorpusStats } from "../lib/api";
import CitationChip from "../components/CitationChip";

const SUGGESTIONS = [
  "Do I need BIS certification for an electric kettle?",
  "What changed for aluminium products in 2026?",
  "Which standard applies to domestic pressure cookers?",
  "What is the Transition Facilitation QCO?",
];

/** Deliberately off-corpus — verified to fail the grounding gate, so this chip demos the honest refusal. */
const HONESTY_TEST = "What is the BIS standard for unicorn saddles?";

const GROUNDING_GATE = 0.3;

function fmtScore(s?: number | null): string {
  return typeof s === "number" ? s.toFixed(2) : "n/a";
}

function GroundingNote({ message }: { message: ChatMessage }) {
  if (message.grounded === false) {
    return (
      <p className="mt-1 text-xs text-signal">
        Honest refusal — best corpus match scored {fmtScore(message.groundingScore)}, below the{" "}
        {GROUNDING_GATE.toFixed(2)} grounding gate, so nothing on file could be cited. Sahayak does not improvise.
      </p>
    );
  }
  const source = message.fellBack
    ? "language model unavailable — answer composed directly from the cited sources"
    : message.synthesis === "corpus"
      ? "answer composed directly from the cited sources (extractive)"
      : "language model, writing strictly from the cited sources";
  return (
    <p className="mt-1 text-xs text-ink-faint">
      Built from {message.citations?.length ?? 0} cited source{(message.citations?.length ?? 0) === 1 ? "" : "s"} ·
      best corpus match {fmtScore(message.groundingScore)} (gate ≥ {GROUNDING_GATE.toFixed(2)}) · {source}.
    </p>
  );
}

export default function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const [stats, setStats] = useState<CorpusStats | null>(null);

  useEffect(() => {
    api<{ items: ChatSession[] }>("/chat/sessions")
      .then((res) => setSessions(res.items))
      .catch((e) => setError(e.message));
    api<CorpusStats>("/stats")
      .then(setStats)
      .catch(() => setStats(null)); // corpus strip is decorative — never block chat on it
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const openSession = useCallback(async (id: string) => {
    setActiveId(id);
    setError(null);
    try {
      const res = await api<{ session: ChatSession; messages: ChatMessage[] }>(`/chat/sessions/${id}`);
      setMessages(res.messages);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  async function newSession(): Promise<string | null> {
    try {
      const session = await api<ChatSession>("/chat/sessions", { method: "POST", body: {} });
      setSessions((prev) => [session, ...prev]);
      setActiveId(session.id);
      setMessages([]);
      return session.id;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setBusy(true);
    setLiveMsg("");
    setInput("");

    let sessionId = activeId;
    if (!sessionId) sessionId = await newSession();
    if (!sessionId) {
      setBusy(false);
      return;
    }

    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content }]);
    try {
      const reply = await api<ChatMessage>(`/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        body: { content },
      });
      setMessages((prev) => [...prev, reply]);
      setLiveMsg(new Date().toISOString()); // triggers the stamp animation on the fresh chips
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem-2.5rem)] max-w-6xl">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-paper-edge bg-paper-deep/50 md:flex">
        <button
          onClick={() => void newSession()}
          className="mx-3 mt-3 border border-navy bg-navy py-2 text-sm font-medium text-white hover:bg-navy-deep"
        >
          + New chat
        </button>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3 pt-3">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => void openSession(s.id)}
              className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-navy-wash ${
                activeId === s.id ? "bg-navy-wash font-medium text-navy" : "text-ink-soft"
              }`}
            >
              {s.title || "Untitled chat"}
            </button>
          ))}
          {sessions.length === 0 && <p className="px-3 py-2 text-xs text-ink-faint">No sessions yet.</p>}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div aria-live="polite" className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-xl pt-10 text-center">
              <h1 className="font-serif text-2xl font-bold text-ink">Ask about Indian Standards or QCOs</h1>
              <p className="mt-3 border-t border-paper-edge pt-3 text-sm leading-relaxed text-ink-soft">
                Answers are grounded in BIS Sahayak's seeded corpus and cite the IS number or QCO name. When
                something isn't on file, Sahayak says so plainly.
              </p>
              <div className="mt-4 border border-paper-edge bg-paper-deep/60 p-4 text-left">
                <p className="smallcaps text-xs font-semibold text-navy">How every answer is built</p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-ink-soft">
                  <li>
                    <strong className="text-ink">Retrieve</strong> — vector search over{" "}
                    {stats
                      ? `${stats.standards.toLocaleString("en-IN")} standards, ${stats.qcos} QCO notifications and ${stats.offices} offices/labs`
                      : "the seeded BIS corpus"}{" "}
                    scraped from official sources.
                  </li>
                  <li>
                    <strong className="text-ink">Score</strong> — each chunk gets a cosine-similarity score against
                    your question; the best score is printed under every answer.
                  </li>
                  <li>
                    <strong className="text-ink">Gate</strong> — if the best match scores below{" "}
                    {GROUNDING_GATE.toFixed(2)} (or shares under 25% of its content words), the question is refused
                    instead of answered.
                  </li>
                  <li>
                    <strong className="text-ink">Synthesise</strong> — the language model may only write from the
                    retrieved, cited chunks. If the model is down, the answer is composed directly from the sources
                    (extractive mode) — the note under each reply tells you which happened.
                  </li>
                </ol>
                <p className="mt-2 border-t border-paper-edge pt-2 text-xs text-ink-faint">
                  The corpus is fixed and versioned — the model cannot browse the internet, so it can never invent a
                  standard, a date or a source. Try the honesty test below to watch the gate refuse a question that
                  isn't on file.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="border border-paper-edge bg-white/70 px-3 py-1.5 text-xs text-ink-soft hover:border-navy hover:text-navy"
                  >
                    {s}
                  </button>
                ))}
                <button
                  onClick={() => void send(HONESTY_TEST)}
                  title="Deliberately off-corpus — watch the grounding gate refuse it"
                  className="border border-signal/60 bg-signal-wash px-3 py-1.5 text-xs text-signal hover:border-signal"
                >
                  Honesty test: {HONESTY_TEST}
                </button>
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] whitespace-pre-wrap border-l-2 border-brass bg-paper-deep px-4 py-2.5 text-sm text-ink">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="max-w-[85%]">
                <div
                  className={`border-l-2 px-4 py-3 text-sm leading-relaxed ${
                    m.grounded === false
                      ? "border-signal bg-signal-wash text-ink"
                      : "border-navy bg-white/80 text-ink"
                  }`}
                >
                  {m.grounded === false && (
                    <p className="smallcaps mb-2 text-xs font-bold text-signal">Not in corpus — honest no-answer</p>
                  )}
                  {m.content}
                </div>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.citations.map((c, i) => (
                      <CitationChip key={`${c.ref}-${i}`} citation={c} animate={liveMsg !== ""} />
                    ))}
                  </div>
                )}
                <GroundingNote message={m} />
              </div>
            ),
          )}

          {busy && (
            <div className="max-w-[85%] border-l-2 border-paper-edge bg-white/60 px-4 py-3 text-sm text-ink-faint">
              Searching the corpus and drafting a cited answer…
            </div>
          )}
          {error && (
            <p role="alert" className="border-l-2 border-signal bg-signal-wash px-3 py-2 text-sm text-signal">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-paper-edge bg-paper p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask a question about Indian Standards or QCOs"
              placeholder="e.g. I make immersion rods — what do I need before selling them?"
              className="flex-1 border border-paper-edge bg-white/80 px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="border border-navy bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
