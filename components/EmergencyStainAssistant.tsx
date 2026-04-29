import React, { useState } from "react";
import { trackWhatsAppClick } from "../analytics";
import { CONTACT_INFO } from "../constants";

const EmergencyStainAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stainType, setStainType] = useState("");
  const [timePassed, setTimePassed] = useState("");
  const [fabricType, setFabricType] = useState("");

  const stainTypes = ["Kahve / Cay", "Kedi/Kopek Idrari", "Kan", "Yag veya Yemek", "Murekkep/Boya", "Diger"];
  const timeOptions = ["Az Once (Hala Islak)", "Bugun (Kurumus)", "Haftalar Once", "Aylar/Yillar Once"];
  const fabricOptions = ["Kadife", "Tay Tuyu", "Keten", "Nubuk", "Deri", "Emin Degilim"];

  const handleWhatsApp = () => {
    const text = `*ACIL LEKE BILDIRIMI*\n\n*Ne Dokuldu:* ${stainType || "Belirtilmedi"}\n*Ne Zaman:* ${timePassed || "Belirtilmedi"}\n*Kumas Turu:* ${fabricType || "Belirtilmedi"}\n\nMerhaba, kumasa zarar vermeden acil mudahale icin bilgi veya fiyat alabilir miyim?`;
    trackWhatsAppClick("emergency_stain_assistant", {
      stain_type: stainType || "unspecified",
      time_passed: timePassed || "unspecified",
      fabric_type: fabricType || "unspecified",
    });
    window.open(`https://wa.me/${CONTACT_INFO.whatsapp.replace(/\s+/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-4 z-[58] flex items-center gap-2 rounded-full border border-red-400/50 bg-red-600 px-3 py-2 text-white shadow-[0_0_20px_rgba(220,38,38,0.45)] transition-all hover:bg-red-500 md:bottom-auto md:left-auto md:right-6 md:top-24 md:px-4"
      >
        <span className="material-symbols-outlined text-lg md:text-xl">emergency</span>
        <span className="text-[10px] font-black tracking-[0.22em] md:text-xs">ACIL LEKE</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-red-500/30 bg-surface-dark p-6 shadow-[0_0_40px_rgba(220,38,38,0.2)] md:p-8">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-background-dark p-3 text-gray-300 transition-colors hover:text-white md:right-4 md:top-4 md:p-2"
              aria-label="Modal kapat"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                <span className="material-symbols-outlined text-2xl animate-pulse">warning</span>
              </div>
              <div>
                <h3 className="text-xl font-black leading-tight text-white">Leke Kurtarma Formu</h3>
                <p className="mt-1 text-xs font-bold text-red-400">Lutfen rastgele kimyasal surmeyin.</p>
              </div>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-gray-300">
              3 soruyu cevaplayin, size en hizli ve guvenli mudahale yolunu cikartalim.
            </p>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">1. Ne Dokuldu?</label>
                <div className="flex flex-wrap gap-2">
                  {stainTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setStainType(type)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        stainType === type
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-white/10 bg-background-dark text-gray-400 hover:border-red-500/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">2. Ne Zaman Oldu?</label>
                <div className="flex flex-wrap gap-2">
                  {timeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTimePassed(option)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        timePassed === option
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-white/10 bg-background-dark text-gray-400 hover:border-red-500/50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">3. Kumas Turu Nedir?</label>
                <div className="flex flex-wrap gap-2">
                  {fabricOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFabricType(option)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        fabricType === option
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-white/10 bg-background-dark text-gray-400 hover:border-red-500/50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={!stainType || !timePassed}
              className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold transition-all ${
                stainType && timePassed
                  ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:bg-red-500"
                  : "cursor-not-allowed bg-gray-700 text-gray-500"
              }`}
            >
              <span className="material-symbols-outlined">send</span>
              Acil Kurtarma Talep Et
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default EmergencyStainAssistant;
