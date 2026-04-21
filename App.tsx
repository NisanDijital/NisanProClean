import React, { Suspense, lazy, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CookieConsent from "./components/CookieConsent";
import {
  hasTrackingConsent,
  initializeAnalytics,
  initializeClarity,
  initializeConversionTracking,
  trackGaRealtimePing,
} from "./analytics";
import { CONTACT_INFO, IMAGES } from "./constants";

const BeforeAfterGallery = lazy(() => import("./components/BeforeAfterGallery"));
const AIStainAnalyzer = lazy(() => import("./components/AIStainAnalyzer"));
const UVScanner = lazy(() => import("./components/UVScanner"));
const PricingCalculator = lazy(() => import("./components/PricingCalculator"));
const Referral = lazy(() => import("./components/Referral"));
const Testimonial = lazy(() => import("./components/Testimonial"));
const FAQ = lazy(() => import("./components/FAQ"));
const Blog = lazy(() => import("./components/Blog"));
const CTA = lazy(() => import("./components/CTA"));
const SEOContent = lazy(() => import("./components/SEOContent"));
const Marquee = lazy(() => import("./components/Marquee"));
const Features = lazy(() => import("./components/Features"));
const SplitSection = lazy(() => import("./components/SplitSection"));
const Footer = lazy(() => import("./components/Footer"));
const ScrollToTop = lazy(() => import("./components/ScrollToTop"));
const FloatingWhatsApp = lazy(() => import("./components/FloatingWhatsApp"));
const SocialProof = lazy(() => import("./components/SocialProof"));
const ExitIntentPopup = lazy(() => import("./components/ExitIntentPopup"));
const EmergencyStainAssistant = lazy(() => import("./components/EmergencyStainAssistant"));

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

const App: React.FC = () => {
  useEffect(() => {
    const runTrackingInit = () => {
      if (!hasTrackingConsent()) return;
      initializeAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);
      initializeClarity(import.meta.env.VITE_CLARITY_PROJECT_ID, import.meta.env.VITE_CLARITY_ALLOWED_HOSTS);
      trackGaRealtimePing("app_init");
    };

    const handleConsent = () => runTrackingInit();

    runTrackingInit();
    window.addEventListener("nisan:consent-updated", handleConsent as EventListener);
    const cleanupConversion = initializeConversionTracking();
    return () => {
      window.removeEventListener("nisan:consent-updated", handleConsent as EventListener);
      cleanupConversion();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main>
        <Hero />
        <Suspense fallback={<div className="h-48" aria-hidden="true" />}>
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
                  className="mt-4 flex items-center gap-2 text-white font-bold hover:gap-4 transition-all"
                >
                  <span>Hemen arayin: {CONTACT_INFO.phone}</span>
                  <span className="material-symbols-outlined text-primary">call</span>
                </a>
                <a
                  href="/koltuk-yikama/"
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
                  className="mt-4 inline-flex items-center gap-2 text-secondary font-semibold hover:text-cyan-300 transition-colors lg:self-end"
                >
                  <span>Kurumsal ve arac hizmet detaylari</span>
                  <span className="material-symbols-outlined text-sm">arrow_outward</span>
                </a>
              </SplitSection>
            </div>
          </section>
        </Suspense>

        <Suspense fallback={<DeferredSectionsFallback />}>
          <div style={{ contentVisibility: "auto", containIntrinsicSize: "2200px" }}>
            <BeforeAfterGallery />
            <AIStainAnalyzer />
            <UVScanner />
            <PricingCalculator />
            <Referral />
            <FAQ />
            <Blog />
            <Testimonial />
            <CTA />
            <SEOContent />
          </div>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
        <ScrollToTop />
        <FloatingWhatsApp />
        <SocialProof />
        <ExitIntentPopup />
        <EmergencyStainAssistant />
      </Suspense>
      <CookieConsent />
    </div>
  );
};

export default App;
