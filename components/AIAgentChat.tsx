import React, { useEffect, useRef, useState } from "react";
import { askAIAgent } from "../apiClient";

type ChatItem = {
  role: "user" | "assistant";
  text: string;
};

const starterPrompts = [
  "Koltuk yikama fiyatlari nedir?",
  "Yarin 13-16 slotu musait mi?",
  "L koltuk + yatak icin fiyat cikar.",
];

const welcomeMessage =
  "Merhaba, ben NisanPro. Fiyat, randevu ve leke yonlendirmesi icin hizli destek veriyorum.";

const AIAgentChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: "assistant",
      text: welcomeMessage,
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [isOpen, messages, sending]);

  useEffect(() => {
    if (!isOpen) return;
    textareaRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (presetText?: string) => {
    const text = (presetText ?? input).trim();
    if (text.length < 2 || sending) return;

    const nextMessages: ChatItem[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSending(true);

    try {
      const reply = await askAIAgent(text, nextMessages);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setError("Baglanti tarafinda bir problem oldu. Bir kez daha deneyelim.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "NisanPro asistanini kapat" : "NisanPro asistanini ac"}
        className={`fixed bottom-28 right-5 z-[72] overflow-hidden rounded-full border px-4 py-3 text-sm font-semibold shadow-[0_14px_34px_rgba(0,0,0,0.38)] transition-all duration-300 ${
          isOpen
            ? "border-cyan-200/40 bg-cyan-100 text-surface-dark"
            : "border-cyan-300/25 bg-gradient-to-r from-primary via-cyan-300 to-teal-200 text-surface-dark hover:scale-[1.03] hover:shadow-[0_18px_42px_rgba(34,211,238,0.35)]"
        }`}
      >
        <span
          className={`absolute inset-0 opacity-70 transition-opacity ${
            isOpen ? "bg-white/0" : "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.55),_transparent_48%)]"
          }`}
        />
        <span className="relative flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
          <span>{isOpen ? "NisanPro acik" : "NisanPro AI"}</span>
        </span>
      </button>

      <div
        className={`fixed bottom-44 right-5 z-[72] w-[min(92vw,380px)] origin-bottom-right transition-all duration-300 ${
          isOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-95 opacity-0"
        }`}
      >
        <div className="overflow-hidden rounded-[18px] border border-white/12 bg-surface-dark shadow-[0_18px_50px_rgba(0,0,0,0.46)] backdrop-blur">
          <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(15,23,42,0.1))] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white text-base font-semibold">NisanPro</p>
                <p className="mt-1 text-xs text-cyan-100/85">Fiyat, randevu ve hizli yonlendirme destegi</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Kapat
              </button>
            </div>
          </div>

          <div ref={listRef} className="h-[22rem] overflow-y-auto px-3 py-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={sending}
                  className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-300/14 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "assistant"
                      ? "mr-auto bg-white/8 text-gray-100"
                      : "ml-auto border border-primary/20 bg-primary/18 text-cyan-50"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            {sending ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-gray-300">
                <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
                NisanPro yaziyor...
              </div>
            ) : null}

            {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
          </div>

          <div className="border-t border-white/10 bg-background-dark/50 p-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesajini yaz. Enter gonderir, Shift+Enter yeni satir."
              rows={2}
              className="w-full resize-none rounded-2xl border border-white/12 bg-background-dark px-3.5 py-3 text-sm text-white placeholder:text-gray-500 focus:border-primary focus:outline-none"
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-400">Randevu icin ad, telefon, adres, tarih ve saat blogu yazabilirsin.</p>
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={sending || input.trim().length < 2}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  sending || input.trim().length < 2
                    ? "cursor-not-allowed bg-gray-700 text-gray-400"
                    : "bg-gradient-to-r from-primary to-cyan-300 text-surface-dark hover:scale-[1.02] hover:shadow-[0_10px_28px_rgba(34,211,238,0.28)]"
                }`}
              >
                {sending ? "Gonderiliyor..." : "Gonder"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAgentChat;
