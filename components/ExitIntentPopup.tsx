import React, { useEffect, useState } from "react";
import { trackEvent, trackWhatsAppClick } from "../analytics";
import { CONTACT_INFO } from "../constants";

const OFFERS = [
  { id: "buhar", title: "UCRETSIZ BUHAR DEZENFEKSIYONU", desc: "300 TL degerinde Sicak Buhar Dezenfeksiyonu", code: "BUHAR2026", icon: "local_fire_department" },
  { id: "leke", title: "UCRETSIZ LEKE CIKARMA", desc: "500 TL degerinde Ozel Leke Cikarma islemi", code: "LEKE2026", icon: "cleaning_services" },
  { id: "percent10", title: "%10 EKSTRA INDIRIM", desc: "Tum hijyen islemlerinde gecerli %10 ekstra indirim", code: "YUZDE10", icon: "percent" },
  { id: "percent5", title: "%5 EKSTRA INDIRIM", desc: "Tum hijyen islemlerinde gecerli %5 ekstra indirim", code: "YUZDE5", icon: "percent" },
  { id: "fixed250", title: "250 TL NAKIT INDIRIM", desc: "Aninda kullanabileceginiz 250 TL indirim", code: "INDIRIM250", icon: "payments" },
  { id: "fixed200", title: "200 TL NAKIT INDIRIM", desc: "Aninda kullanabileceginiz 200 TL indirim", code: "INDIRIM200", icon: "payments" },
  { id: "fixed100", title: "100 TL NAKIT INDIRIM", desc: "Aninda kullanabileceginiz 100 TL indirim", code: "INDIRIM100", icon: "payments" },
];

const ExitIntentPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [offer, setOffer] = useState(OFFERS[0]);

  useEffect(() => {
    setOffer(OFFERS[Math.floor(Math.random() * OFFERS.length)]);

    let canTrigger = false;
    const initialDelay = window.setTimeout(() => {
      canTrigger = true;
    }, 5000);

    const handleMouseLeave = (e: MouseEvent) => {
      const isMobile = window.innerWidth < 768;
      if (isMobile || !canTrigger || hasTriggered) return;
      if (e.clientY <= 5) {
        setIsVisible(true);
        setHasTriggered(true);
        trackEvent("exit_intent_popup_open", { source: "exit_intent", trigger: "mouseleave_top" });
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(initialDelay);
    };
  }, [hasTriggered]);

  if (!isVisible) return null;

  const closePopup = (reason: "close_button" | "dismiss_button") => {
    trackEvent("exit_intent_popup_close", { source: "exit_intent", reason, offer_id: offer.id });
    setIsVisible(false);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Merhaba, cikarken gordugum '${offer.title}' firsatindan yararlanmak istiyorum. Kod: ${offer.code}`
    );
    trackWhatsAppClick("exit_intent_popup", {
      offer_id: offer.id,
      offer_code: offer.code,
    });
    window.open(`https://wa.me/905079581642?text=${message}`, "_blank");
    setIsVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-primary/30 shadow-[0_0_50px_rgba(45,212,191,0.2)] relative text-center transform transition-all scale-100 animate-fade-in-down">
        <button
          onClick={() => closePopup("close_button")}
          className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-300 hover:text-white transition-colors rounded-full bg-background-dark/70 p-3 md:p-1"
          aria-label="Popup kapat"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="size-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6 animate-bounce">
          <span className="material-symbols-outlined text-3xl">{offer.icon}</span>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Gitmeden Once</h2>
        <p className="text-gray-300 mb-6 text-sm leading-relaxed">
          Bugune ozel kampanya ile <strong className="text-primary">{offer.desc}</strong> firsatini degerlendir.
        </p>

        <div className="bg-background-dark border border-white/10 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-500 mb-1">Firsat Kodunuz:</p>
          <p className="text-xl font-mono font-bold text-white tracking-widest">{offer.code}</p>
        </div>

        <button
          onClick={handleWhatsApp}
          className="relative overflow-hidden w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_30px_rgba(37,211,102,0.5)] flex items-center justify-center gap-2 group"
        >
          <span className="material-symbols-outlined relative z-10">chat</span>
          <span className="relative z-10">Hediyemi Al ve Randevu Olustur</span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine z-0"></div>
        </button>

        <button
          onClick={() => closePopup("dismiss_button")}
          className="mt-5 text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
        >
          Simdilik istemiyorum.
        </button>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
