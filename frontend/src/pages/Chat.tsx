import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, type ChatMessage, type ChatSession } from "../lib/api";
import CitationChip from "../components/CitationChip";

const SUGGESTIONS = [
  "Do I need BIS certification for an electric kettle?",
  "What changed for aluminium products in 2026?",
  "Which standard applies to domestic pressure cookers?",
  "What is the Transition Facilitation QCO?",
];

export default function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    <div className="mx-auto flex h-[calc(100vh-3.5rem-2.5rem)] max-w-6xl gap-0 px-0">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-100 bg-white md:flex">
        <button
          onClick={() => void newSession()}
          className="m-3 rounded-lg bg-saffron-500 py-2 text-sm font-semibold text-ink-900 hover:bg-saffron-400"
        >
          + New chat
        </button>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => void openSession(s.id)}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                activeId === s.id ? "bg-ink-100 font-medium text-ink-900" : "text-slate-600"
              }`}
            >
              {s.title || "Untitled chat"}
            </button>
          ))}
          {sessions.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No sessions yet.</p>}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-xl pt-10 text-center">
              <h1 className="text-xl font-bold">Ask about Indian Standards or QCOs</h1>
              <p className="mt-2 text-sm text-slate-600">
                Answers are grounded in BIS Sahayak's seeded corpus and cite the IS number or QCO name. When
                something isn't on file, Sahayak will say so plainly.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-ink-700 hover:text-ink-900"
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
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-800 px-4 py-2.5 text-sm text-white">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="max-w-[85%]">
                <div
                  className={`whitespace-pre-wrap rounded-2xl rounded-bl-sm px-4 py-3 text-sm ${
                    m.grounded === false
                      ? "border border-amber-300 bg-amber-50 text-amber-900"
                      : "border border-ink-100 bg-white text-ink-900"
                  }`}
                >
                  {m.grounded === false && (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Not in corpus — honest no-answer
                    </p>
                  )}
                  {m.content}
                </div>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.citations.map((c, i) => (
                      <CitationChip key={`${c.ref}-${i}`} citation={c} />
                    ))}
                  </div>
                )}
              </div>
            ),
          )}

          {busy && (
            <div className="max-w-[85%] rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-slate-400">
              Searching the corpus and drafting a cited answer…
            </div>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-ink-100 bg-white p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. I make immersion rods — what do I need before selling them?"
              className="flex-1 rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:border-ink-700 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-ink-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-900 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
