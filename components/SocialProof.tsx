import React, { useEffect, useState } from "react";
import { trackEvent } from "../analytics";

const NAMES = ["Ahmet Y.", "Ayse K.", "Mehmet T.", "Fatma S.", "Caner B.", "Zeynep A.", "Burak C.", "Elif D.", "Mustafa E.", "Merve F."];
const LOCATIONS = ["Afyon Merkez", "Erenler", "Uydukent", "Sahipata", "Erkmen", "Fatih", "Kanlica", "Gazi"];
const SERVICES = [
  "Koltuk Hijyeni",
  "Yatak Hijyeni",
  "Arac Koltuk Temizligi",
  "Altin Kasko VIP Paketi",
  "Gumus Kasko",
  "Leke Cikarma (Buharli)",
  "Platin VIP Kasko Aboneligi",
  "U Kose Takimi Temizligi",
];

type SocialProofMode = "viewers" | "booking";

const SocialProof: React.FC = () => {
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 6) + 5);
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<SocialProofMode>("viewers");
  const [booking, setBooking] = useState({ name: "", location: "", service: "" });

  useEffect(() => {
    const initialTimer = setTimeout(() => setIsVisible(true), 3000);

    const viewerInterval = setInterval(() => {
      setViewers((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return next < 4 ? 4 : next > 14 ? 14 : next;
      });
    }, 4000);

    const cycleInterval = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setMode((prev) => {
          if (prev === "viewers") {
            setBooking({
              name: NAMES[Math.floor(Math.random() * NAMES.length)],
              location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
              service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
            });
            return "booking";
          }
          return "viewers";
        });
        setIsVisible(true);
      }, 900);
    }, 12000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(viewerInterval);
      clearInterval(cycleInterval);
    };
  }, []);

  const handleCardClick = () => {
    trackEvent("social_proof_click", {
      source: "social_proof",
      mode,
      target: "testimonials",
    });
    document.getElementById("testimonials")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-700 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={handleCardClick}
        className="glass-card bg-surface-dark/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 max-w-[320px] text-left hover:border-primary/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-all"
        aria-label="Yorumlari incele"
      >
        {mode === "viewers" ? (
          <>
            <div className="relative flex items-center justify-center size-10 rounded-full bg-primary/20 text-primary shrink-0">
              <span className="absolute inset-0 rounded-full border border-primary animate-ping opacity-40"></span>
              <span className="material-symbols-outlined text-[20px]">visibility</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium leading-snug">
                Su an <strong className="text-primary">{viewers} kisi</strong> bu sayfayi inceliyor.
              </p>
              <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wide">Yorumlari Incele</p>
            </div>
          </>
        ) : (
          <>
            <div
              className={`flex items-center justify-center size-10 rounded-full shrink-0 ${
                booking.service.includes("Kasko") ? "bg-yellow-500/20 text-yellow-500" : "bg-[#25D366]/20 text-[#25D366]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {booking.service.includes("Kasko") ? "workspace_premium" : "event_available"}
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">
                {booking.name} ({booking.location})
              </p>
              <p className="text-white text-sm font-medium leading-snug">
                Az once{" "}
                <strong className={booking.service.includes("Kasko") ? "text-yellow-500" : "text-[#25D366]"}>
                  {booking.service}
                </strong>{" "}
                {booking.service.includes("Kasko") ? "satin aldi." : "randevusu aldi."}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wide">Incele</p>
            </div>
          </>
        )}
      </button>
    </div>
  );
};

export default SocialProof;
