import React, { useEffect, useRef, useState } from "react";
import { askAIAgent } from "../apiClient";
import { getTrackingConsent } from "../analytics";
import { CONTACT_INFO } from "../constants";

type ChatItem = {
  role: "user" | "assistant";
  text: string;
};

const starterPrompts = [
  { label: "Fiyat", text: "Koltuk yikama fiyatlari nedir?" },
  { label: "Randevu", text: "Yarin 13-16 slotu musait mi?" },
  { label: "Paket", text: "L koltuk + yatak icin fiyat cikar." },
];

const welcomeMessage =
  "Merhaba, ben NisanPro. Fiyat, randevu ve hizmet secimi icin hizli destek veriyorum.";

const AIAgentChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [canShow, setCanShow] = useState(() => getTrackingConsent() !== null);
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
  const whatsappHandoffUrl = `${CONTACT_INFO.whatsappLink}?text=${encodeURIComponent(
    "Merhaba, NisanPro asistanindan geldim. Fiyat ve randevu icin bilgi almak istiyorum."
  )}`;

  useEffect(() => {
    const handleConsentUpdate = () => setCanShow(true);
    window.addEventListener("nisan:consent-updated", handleConsentUpdate as EventListener);
    return () => window.removeEventListener("nisan:consent-updated", handleConsentUpdate as EventListener);
  }, []);

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

  if (!canShow) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "NisanPro asistanini kapat" : "NisanPro asistanini ac"}
        className={`fixed bottom-6 left-4 z-[64] overflow-hidden rounded-full border px-4 py-3 text-sm font-semibold shadow-[0_14px_34px_rgba(0,0,0,0.34)] transition-all duration-300 md:bottom-6 md:left-6 ${
          isOpen
            ? "border-cyan-200/45 bg-cyan-100 text-surface-dark"
            : "border-cyan-300/25 bg-surface-dark/95 text-white hover:border-cyan-200/50 hover:bg-surface-dark"
        }`}
      >
        <span
          className={`absolute inset-0 opacity-70 transition-opacity ${
            isOpen ? "bg-white/0" : "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.55),_transparent_48%)]"
          }`}
        />
        <span className="relative flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
          <span>{isOpen ? "NisanPro acik" : "NisanPro"}</span>
        </span>
      </button>

      <div
        aria-hidden={!isOpen}
        className={`fixed inset-x-3 bottom-24 z-[64] origin-bottom-left transition-all duration-300 md:inset-x-auto md:bottom-24 md:left-6 md:w-[390px] ${
          isOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-95 opacity-0"
        }`}
      >
        <div className="overflow-hidden rounded-lg border border-white/12 bg-surface-dark shadow-[0_18px_50px_rgba(0,0,0,0.46)] backdrop-blur">
          <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white text-base font-semibold">NisanPro Asistan</p>
                <p className="mt-1 text-xs text-cyan-100/85">Fiyat, randevu ve WhatsApp aktarimi</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="NisanPro asistanini kapat"
                className="min-h-10 min-w-10 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg leading-none">close</span>
              </button>
            </div>
          </div>

          <div ref={listRef} className="h-[min(52vh,22rem)] overflow-y-auto px-3 py-3 md:h-[22rem]">
            <div className="mb-3 flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => void sendMessage(prompt.text)}
                  disabled={sending}
                  className="rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/14 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt.label}
                </button>
              ))}
              <a
                href={whatsappHandoffUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="NisanPro randevu destek hattini WhatsApp'ta ac"
                className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/16"
              >
                WhatsApp'a gec
              </a>
            </div>

            <div className="space-y-2.5">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "assistant"
                      ? "mr-auto rounded-bl-lg bg-white/8 text-gray-100"
                      : "ml-auto rounded-br-lg border border-primary/20 bg-primary/18 text-cyan-50"
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
              className="w-full resize-none rounded-lg border border-white/12 bg-background-dark px-3.5 py-3 text-base text-white placeholder:text-gray-500 focus:border-primary focus:outline-none md:text-sm"
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-400">Randevu icin ad, telefon, adres, tarih ve saat blogu yeterli.</p>
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={sending || input.trim().length < 2}
                className={`min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  sending || input.trim().length < 2
                    ? "cursor-not-allowed bg-gray-700 text-gray-400"
                    : "bg-primary text-surface-dark hover:bg-cyan-300"
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
