import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, type ChatMessage, type ChatSession } from "../lib/api";
import CitationChip from "../components/CitationChip";

const SUGGESTIONS = [
  "Do I need BIS certification for an electric kettle?",
  "What changed for aluminium products in 2026?",
  "Which standard applies to domestic pressure cookers?",
  "What is the Transition Facilitation QCO?",
];

function SynthesisNote({ message }: { message: ChatMessage }) {
  if (message.grounded === false) {
    return (
      <p className="mt-1 text-xs text-ink-faint">
        Refused honestly — the corpus has nothing on this, and Sahayak does not improvise.
      </p>
    );
  }
  if (message.fellBack) {
    return (
      <p className="mt-1 text-xs text-moss">
        Language model unavailable — answered directly from the verified sources cited above.
      </p>
    );
  }
  if (message.synthesis === "corpus") {
    return <p className="mt-1 text-xs text-ink-faint">Composed directly from the cited records (extractive mode).</p>;
  }
  return <p className="mt-1 text-xs text-ink-faint">Synthesised by the language model strictly from the cited records.</p>;
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

  useEffect(() => {
    api<{ items: ChatSession[] }>("/chat/sessions")
      .then((res) => setSessions(res.items))
      .catch((e) => setError(e.message));
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
                <SynthesisNote message={m} />
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
