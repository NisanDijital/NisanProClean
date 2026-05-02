import React, { Suspense, lazy, useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CookieConsent from "./components/CookieConsent";
import LazyRender from "./components/LazyRender";
import {
  hasTrackingConsent,
  initializeAnalytics,
  initializeClarity,
  initializeConversionTracking,
  trackGaRealtimePing,
} from "./analytics";
import { CONTACT_INFO, IMAGES } from "./constants";

const BeforeAfterGallery = lazy(() => import("./components/BeforeAfterGallery"));
const PricingCalculator = lazy(() => import("./components/PricingCalculator"));
const Testimonial = lazy(() => import("./components/Testimonial"));
const FAQ = lazy(() => import("./components/FAQ"));
const Blog = lazy(() => import("./components/Blog"));
const CTA = lazy(() => import("./components/CTA"));
const SEOContent = lazy(() => import("./components/SEOContent"));
const Marquee = lazy(() => import("./components/Marquee"));
const Features = lazy(() => import("./components/Features"));
const SplitSection = lazy(() => import("./components/SplitSection"));
const Footer = lazy(() => import("./components/Footer"));
const FloatingWhatsApp = lazy(() => import("./components/FloatingWhatsApp"));
const AIAgentChat = lazy(() => import("./components/AIAgentChat"));

const DeferredSectionsFallback: React.FC = () => (
  <section className="py-16 px-4" aria-hidden="true">
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="h-72 rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse" />
      <div className="h-64 rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse" />
      <div className="h-[28rem] rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse" />
      <div className="h-72 rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse" />
    </div>
  </section>
);

const MidSectionsFallback: React.FC = () => (
  <section className="py-12 px-4" aria-hidden="true">
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="h-16 rounded-xl bg-white/[0.04] border border-white/10 animate-pulse" />
      <div className="h-24 rounded-xl bg-white/[0.04] border border-white/10 animate-pulse" />
      <div className="h-96 rounded-xl bg-white/[0.04] border border-white/10 animate-pulse" />
    </div>
  </section>
);

const App: React.FC = () => {
  const [showDeferredUi, setShowDeferredUi] = useState(false);
  const isBlogRoute = typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/blog";

  useEffect(() => {
    let trackingTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let trackingIdleId: number | undefined;
    let cleanupConversion: (() => void) | undefined;

    const runTrackingInit = () => {
      if (!hasTrackingConsent()) return;
      if (cleanupConversion) cleanupConversion();
      initializeAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);
      initializeClarity(import.meta.env.VITE_CLARITY_PROJECT_ID, import.meta.env.VITE_CLARITY_ALLOWED_HOSTS);
      trackGaRealtimePing("app_init");
      cleanupConversion = initializeConversionTracking();
    };

    const scheduleTrackingInit = () => {
      if ("requestIdleCallback" in window) {
        trackingIdleId = (
          window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => number }
        ).requestIdleCallback(runTrackingInit, { timeout: 2200 });
        return;
      }
      trackingTimeoutId = globalThis.setTimeout(runTrackingInit, 900);
    };

    const handleConsent = () => scheduleTrackingInit();

    scheduleTrackingInit();
    window.addEventListener("nisan:consent-updated", handleConsent as EventListener);
    return () => {
      if (trackingTimeoutId) window.clearTimeout(trackingTimeoutId);
      if (trackingIdleId && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(trackingIdleId);
      }
      if (cleanupConversion) cleanupConversion();
      window.removeEventListener("nisan:consent-updated", handleConsent as EventListener);
    };
  }, []);

  useEffect(() => {
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const activateDeferredUi = () => setShowDeferredUi(true);
    const hasIdleCallback = "requestIdleCallback" in window;

    if (hasIdleCallback) {
      idleId = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => number })
        .requestIdleCallback(activateDeferredUi, { timeout: 1800 });
    } else {
      timeoutId = window.setTimeout(activateDeferredUi, 1200);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (idleId && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
    };
  }, []);

  if (isBlogRoute) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <Navbar />
        <main className="pt-20">
          <Suspense fallback={<MidSectionsFallback />}>
            <Blog />
          </Suspense>
        </main>
        {showDeferredUi ? (
          <Suspense fallback={null}>
            <Footer />
            <FloatingWhatsApp />
            <AIAgentChat />
          </Suspense>
        ) : null}
        <CookieConsent />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main>
        <Hero />
        <LazyRender minHeight={1200}>
          <Suspense fallback={<MidSectionsFallback />}>
            <Marquee />
            <Features />

            <section id="services" className="py-20 px-4 scroll-mt-24">
              <div className="max-w-7xl mx-auto flex flex-col gap-24">
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-gray-100">
                  Hizmet bolgesi: Afyon Merkez
                </div>
                <SplitSection
                  image={IMAGES.livingRoom}
                  imageAlt="Modern salon koltugu"
                  category="Yerinde Yikama"
                  title="Evinizdeki Ferahlik"
                  description="L koltuk, berjer ve cekyat gibi yuzeyleri yerinden oynatmadan profesyonel ekipmanla temizliyoruz."
                  theme="primary"
                  reverse={false}
                >
                  <ul className="flex flex-col gap-3 text-gray-300 mt-2">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                      <span>Leke ve koku giderme</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                      <span>Hizli kuruma teknolojisi</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                      <span>Anti alerjik koruma</span>
                    </li>
                  </ul>
                  <a
                    href={CONTACT_INFO.phoneLink}
                    data-analytics-source="services_call_cta"
                    title="Hizmet icin telefonla hemen ara"
                    className="mt-4 flex items-center gap-2 text-white font-bold hover:gap-4 transition-all"
                  >
                    <span>Hemen arayin: {CONTACT_INFO.phone}</span>
                    <span className="material-symbols-outlined text-primary">call</span>
                  </a>
                  <a
                    href="/koltuk-yikama/"
                    title="Koltuk yikama detay sayfasina git"
                    className="mt-2 inline-flex items-center gap-2 text-primary font-semibold hover:text-cyan-300 transition-colors"
                  >
                    <span>Detayli hizmet sayfasi</span>
                    <span className="material-symbols-outlined text-sm">arrow_outward</span>
                  </a>
                </SplitSection>

                <SplitSection
                  image={IMAGES.office}
                  imageAlt="Kurumsal ofis alani"
                  category="Kurumsal"
                  title="Ofis ve Otel Temizligi"
                  description="Bekleme alani koltuklari ve kurumsal dosemeler icin toplu ve planli temizlik cozumleri sunuyoruz."
                  theme="secondary"
                  reverse
                >
                  <ul className="flex flex-col gap-3 text-gray-300 mt-2 lg:items-end">
                    <li className="flex items-center gap-3">
                      <span>Mesai disinda uygulama</span>
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span>Toplu alimda ozel fiyat</span>
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span>Duzenli bakim anlasmasi</span>
                      <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                    </li>
                  </ul>
                  <a
                    href="/arac-koltugu-yikama/"
                    title="Kurumsal ve arac koltugu yikama detaylarina git"
                    className="mt-4 inline-flex items-center gap-2 text-secondary font-semibold hover:text-cyan-300 transition-colors lg:self-end"
                  >
                    <span>Kurumsal ve arac hizmet detaylari</span>
                    <span className="material-symbols-outlined text-sm">arrow_outward</span>
                  </a>
                </SplitSection>
              </div>
            </section>
          </Suspense>
        </LazyRender>

        <LazyRender minHeight={1800}>
          <Suspense fallback={<DeferredSectionsFallback />}>
            <div style={{ contentVisibility: "auto", containIntrinsicSize: "2200px" }}>
              <BeforeAfterGallery />
              <PricingCalculator />
              <FAQ />
              <Blog />
              <Testimonial />
              <CTA />
              <SEOContent />
            </div>
          </Suspense>
        </LazyRender>
      </main>
      {showDeferredUi ? (
        <Suspense fallback={null}>
          <Footer />
          <FloatingWhatsApp />
          <AIAgentChat />
        </Suspense>
      ) : null}
      <CookieConsent />
    </div>
  );
};

export default App;
