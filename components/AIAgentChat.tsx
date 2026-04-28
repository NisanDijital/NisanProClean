import React, { useState } from "react";
import { askAIAgent } from "../apiClient";

type ChatItem = {
  role: "user" | "assistant";
  text: string;
};

const AIAgentChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: "assistant",
      text: "Merhaba, NisanProClean AI Asistan burda. Hizmet veya randevu ile ilgili sorunu yazabilirsin.",
    },
  ]);

  const sendMessage = async () => {
    const text = input.trim();
    if (text.length < 2 || sending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    const reply = await askAIAgent(text);
    setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    setSending(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="AI Asistani ac"
        className="fixed bottom-28 right-5 z-[72] bg-primary hover:bg-cyan-400 text-surface-dark font-bold px-4 py-3 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all"
      >
        {isOpen ? "AI Asistani Kapat" : "AI Asistani"}
      </button>

      {isOpen ? (
        <div className="fixed bottom-44 right-5 z-[72] w-[min(92vw,360px)] bg-surface-dark border border-white/15 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white font-semibold">NisanProClean AI Asistan</p>
            <p className="text-gray-300 text-xs">Hizmet ve randevu sorulari icin hizli destek</p>
          </div>

          <div className="h-72 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  message.role === "assistant"
                    ? "bg-white/10 text-gray-100 mr-6"
                    : "bg-primary/20 text-cyan-100 ml-6 border border-primary/30"
                }`}
              >
                {message.text}
              </div>
            ))}
            {sending ? <p className="text-xs text-gray-400 px-1">AI Asistan yaziyor...</p> : null}
          </div>

          <div className="p-3 border-t border-white/10 space-y-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Sorunu yaz..."
              rows={2}
              className="w-full bg-background-dark border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary resize-none"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || input.trim().length < 2}
              className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                sending || input.trim().length < 2
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-surface-dark hover:bg-cyan-400"
              }`}
            >
              {sending ? "Gonderiliyor..." : "Mesaji Gonder"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default AIAgentChat;
