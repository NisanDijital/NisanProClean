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
    <aside className="fixed inset-x-3 bottom-3 z-[110] md:bottom-6 md:left-6 md:right-auto md:max-w-md">
      <div className="glass-card rounded-2xl border border-white/10 bg-surface-dark/96 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.36)] backdrop-blur-md md:p-5">
        <p className="text-white text-sm font-semibold mb-2">Cerez Tercihi</p>
        <p className="text-gray-300 text-xs leading-relaxed">
          Site performansini olcmek ve deneyimi iyilestirmek icin analitik cerezler kullanmak istiyoruz.
          Detaylar icin{" "}
          <a href="/cerez-politikasi.html" title="Cerez politikasi sayfasini ac" className="text-primary hover:underline">
            Cerez Politikasi
          </a>
          .
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => applyDecision("denied")}
            className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/5"
          >
            Reddet
          </button>
          <button
            onClick={() => applyDecision("granted")}
            className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-background-dark transition-colors hover:bg-cyan-300"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </aside>
  );
};

export default CookieConsent;
