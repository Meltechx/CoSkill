"use client";

import { FormEvent, useState } from "react";
import { users } from "@/lib/api";

type Message = { role: "user" | "assistant"; text: string };

const PROMPTS = ["What should I work on?", "Show my progress", "Suggest next task"];

export default function DashboardAssistant({ token }: { token: string | null }) {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "I can help prioritize your work, summarize progress, or suggest the next task." }]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !token || sending) return;
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setDraft("");
    setSending(true);
    try {
      const { reply } = await users.dashboardAssistant(trimmed, token);
      setMessages((current) => [...current, { role: "assistant", text: reply }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", text: error instanceof Error ? error.message : "I couldn't reach the assistant. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void send(draft); };

  return <section className="dashboard-assistant" aria-label="AI Assistant">
    <div className="dashboard-assistant-header"><div><span className="assistant-online-dot" aria-hidden /><h2>AI Assistant</h2><span className="assistant-online-label">online</span></div><span>GPT-5.6</span></div>
    <div className="assistant-prompts">{PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => void send(prompt)} disabled={sending}>{prompt}</button>)}</div>
    <div className="assistant-messages" aria-live="polite">
      {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>{message.role === "assistant" && <span className="assistant-robot" aria-hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" /></svg></span>}<p>{message.text}</p></div>)}
      {sending && <div className="assistant-message assistant"><span className="assistant-robot" aria-hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" /></svg></span><p className="assistant-typing">Thinking…</p></div>}
    </div>
    <form onSubmit={submit} className="assistant-form"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask anything..." disabled={!token || sending} /><button type="submit" disabled={!draft.trim() || !token || sending} aria-label="Send message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 14-7-4 14-3-5-7-2Z" /><path d="m12 14 7-9" /></svg></button></form>
  </section>;
}
