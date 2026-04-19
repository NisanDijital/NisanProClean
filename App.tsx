import React, { Suspense, lazy, useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import Features from "./components/Features";
import SplitSection from "./components/SplitSection";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import SocialProof from "./components/SocialProof";
import ExitIntentPopup from "./components/ExitIntentPopup";
import EmergencyStainAssistant from "./components/EmergencyStainAssistant";
import { initializeAnalytics, initializeClarity, initializeConversionTracking } from "./analytics";
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

const App: React.FC = () => {
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  useEffect(() => {
    const reveal = () => {
      window.setTimeout(() => setShowDeferredSections(true), 1200);
    };

    if (document.readyState === "complete") {
      reveal();
      return;
    }

    window.addEventListener("load", reveal, { once: true });
    return () => window.removeEventListener("load", reveal);
  }, []);

  useEffect(() => {
    initializeAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);
    initializeClarity(import.meta.env.VITE_CLARITY_PROJECT_ID, import.meta.env.VITE_CLARITY_ALLOWED_HOSTS);
    return initializeConversionTracking();
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Features />

        <section id="services" className="py-20 px-4 scroll-mt-24">
          <div className="max-w-7xl mx-auto flex flex-col gap-24">
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
            </SplitSection>
          </div>
        </section>

        {showDeferredSections ? (
          <Suspense
            fallback={
              <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto text-center text-gray-400">Icerik yukleniyor...</div>
              </section>
            }
          >
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
          </Suspense>
        ) : null}
      </main>
      <Footer />
      <ScrollToTop />
      <FloatingWhatsApp />
      <SocialProof />
      <ExitIntentPopup />
      <EmergencyStainAssistant />
    </div>
  );
};

export default App;
