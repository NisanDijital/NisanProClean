import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Features from './components/Features';
import BeforeAfterGallery from './components/BeforeAfterGallery';
import AIStainAnalyzer from './components/AIStainAnalyzer';
import UVScanner from './components/UVScanner';
import SplitSection from './components/SplitSection';
import PricingCalculator from './components/PricingCalculator';
import Referral from './components/Referral';
import Testimonial from './components/Testimonial';
import FAQ from './components/FAQ';
import Blog from './components/Blog';
import CTA from './components/CTA';
import SEOContent from './components/SEOContent';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import SocialProof from './components/SocialProof';
import ExitIntentPopup from './components/ExitIntentPopup';
import EmergencyStainAssistant from './components/EmergencyStainAssistant';
import { CONTACT_INFO, IMAGES } from './constants';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <BeforeAfterGallery />
        <AIStainAnalyzer />
        <UVScanner />
        
        <section id="services" className="py-20 px-4 scroll-mt-24">
          <div className="max-w-7xl mx-auto flex flex-col gap-24">
            <SplitSection
              image={IMAGES.livingRoom}
              imageAlt="Modern minimalist living room with white sofa and sunlight"
              category="Yerinde Yıkama"
              title="Evinizdeki Ferahlık"
              description="L koltuklar, berjerler, çekyatlar... Evinizin en çok kullanılan eşyaları zamanla kirlenir. NisanProClean ekibimiz evinize gelerek eşyalarınızı yerinden oynatmadan profesyonelce temizler."
              theme="primary"
              reverse={false}
            >
              <ul className="flex flex-col gap-3 text-gray-300 mt-2">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Leke ve Koku Giderme</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Hızlı Kuruma Teknolojisi</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Anti-Alerjik Koruma</span>
                </li>
                <li className="flex items-center gap-3 mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="material-symbols-outlined text-primary">local_fire_department</span>
                  <div>
                    <strong className="text-white block text-sm">Sıcak Buhar Dezenfeksiyonu (Ekstra)</strong>
                    <span className="text-xs text-gray-400">140 derece buhar ile mayt, bakteri ve virüslere karşı derinlemesine hijyen.</span>
                  </div>
                </li>
              </ul>
              <a 
                href={CONTACT_INFO.phoneLink}
                className="mt-4 flex items-center gap-2 text-white font-bold hover:gap-4 transition-all"
              >
                <span>Hemen Arayın: {CONTACT_INFO.phone}</span>
                <span className="material-symbols-outlined text-primary">call</span>
              </a>
            </SplitSection>

            <SplitSection
              image={IMAGES.office}
              imageAlt="Modern corporate office interior with glass walls"
              category="Kurumsal"
              title="Ofis & Otel Temizliği"
              description="İş yerinizdeki sandalyeler, bekleme salonu koltukları ve konferans odası mobilyaları için toplu temizlik çözümleri sunuyoruz. Prestijiniz temizliğinizle başlar."
              theme="secondary"
              reverse={true}
            >
              <ul className="flex flex-col gap-3 text-gray-300 mt-2 lg:items-end">
                <li className="flex items-center gap-3">
                  <span>Mesai Saatleri Dışında Hizmet</span>
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                </li>
                <li className="flex items-center gap-3">
                  <span>Toplu Alımlarda Özel İndirim</span>
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                </li>
                <li className="flex items-center gap-3">
                  <span>Düzenli Bakım Anlaşmaları</span>
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
                </li>
              </ul>
              <button className="mt-4 flex items-center gap-2 text-white font-bold hover:gap-4 transition-all">
                <span>Kurumsal Teklif Alın</span>
                <span className="material-symbols-outlined text-secondary">arrow_forward</span>
              </button>
            </SplitSection>
          </div>
        </section>

        <PricingCalculator />
        <Referral />
        <FAQ />
        <Blog />
        <Testimonial />
        <CTA />
        <SEOContent />
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