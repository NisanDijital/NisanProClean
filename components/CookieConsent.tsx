import React, { useEffect, useState } from "react";
import { getTrackingConsent, setTrackingConsent, trackEvent } from "../analytics";

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getTrackingConsent() === null) {
      setVisible(true);
    }
  }, []);

  const applyDecision = (decision: "granted" | "denied") => {
    setTrackingConsent(decision);
    trackEvent("cookie_consent_update", {
      source: "cookie_banner",
      decision,
    });
    window.dispatchEvent(
      new CustomEvent("nisan:consent-updated", {
        detail: { decision },
      })
    );
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="fixed left-4 right-4 bottom-4 md:left-auto md:right-6 md:max-w-md z-[110]">
      <div className="glass-card border border-white/10 rounded-2xl p-4 md:p-5 bg-surface-dark/95 backdrop-blur-md shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        <p className="text-white text-sm font-semibold mb-2">Cerez Tercihi</p>
        <p className="text-gray-300 text-xs leading-relaxed">
          Site performansini olcmek ve deneyimi iyilestirmek icin analitik cerezler kullanmak istiyoruz.
          Detaylar icin{" "}
          <a href="/cerez-politikasi.html" className="text-primary hover:underline">
            Cerez Politikasi
          </a>
          .
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => applyDecision("denied")}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold border border-white/15 text-gray-200 hover:bg-white/5 transition-colors"
          >
            Reddet
          </button>
          <button
            onClick={() => applyDecision("granted")}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold bg-primary text-background-dark hover:bg-cyan-300 transition-colors"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </aside>
  );
};

export default CookieConsent;
