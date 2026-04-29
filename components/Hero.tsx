import React from "react";
import { CONTACT_INFO, IMAGES } from "../constants";
import { trackEvent } from "../analytics";
import OptimizedImage from "./OptimizedImage";

const scrollToNextSection = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  const target = document.getElementById("features");
  if (!target) return;
  trackEvent("scroll_hint_click", { source: "hero", target: "features" });
  target.scrollIntoView({ behavior: "smooth", block: "start" });
};

const Hero: React.FC = () => {
  const heroSrcSet = [
    "/media/hero-768.jpg 768w",
    "/media/hero-1280.jpg 1280w",
    "/media/hero-1920.jpg 1920w",
  ].join(", ");

  return (
    <header className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/30 via-background-dark/80 to-background-dark z-10" />
        <OptimizedImage
          src={IMAGES.heroBg}
          srcSet={heroSrcSet}
          sizes="100vw"
          alt="Yerinde koltuk temizligi hizmeti"
          width={1920}
          height={1080}
          className="w-full h-full object-cover opacity-40"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-32 md:pt-40 text-center flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-4">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-gray-300 uppercase tracking-widest">
            NisanProClean Profesyonelligi
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.1] max-w-5xl mx-auto">
          Koltuklarinizda <br />
          <span className="text-gradient-primary">Derinlemesine Hijyen</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
          Gelismis kumas analizi ve yuksek vakum teknolojisi ile koltuklarinizin
          dokusunu yeniliyoruz.
        </p>

        <div className="grid w-full max-w-5xl gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-background-dark/75 p-5 text-left backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Hizli Kanit
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  Once-sonra sonucu, fiyat ve randevu akisina hizlica ulasin.
                </p>
              </div>
              <a
                href="#gallery"
                title="Oncesi ve sonrasi galeri bolumune git"
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:border-primary hover:bg-primary/10"
              >
                Galeriye Git
                <span className="material-symbols-outlined text-base">arrow_downward</span>
              </a>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
                  <span className="material-symbols-outlined text-primary text-base">image_search</span>
                  Once
                </div>
                <p className="mt-3 text-lg font-bold text-white">Leke, koku ve yogun kullanim izi</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Acik renkli koltuk, yatak ve arac dosemelerinde sorunlu bolgeleri netlestiriyoruz.
                </p>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  Sonra
                </div>
                <p className="mt-3 text-lg font-bold text-white">Kontrollu nem ve hizli kuruma</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-200">
                  Uygun yuzeyde 4-6 saat kuruma hedefiyle, kumas turune gore temizlik protokolu uyguluyoruz.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-background-dark/75 p-5 text-left backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Hizmet Sekli
              </p>
              <h2 className="mt-3 text-xl font-bold text-white">Afyon Merkez odakli yerinde temizlik</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                Telefon veya WhatsApp ile fotograf gonderin, uygun gun ve saat bloklarini birlikte netlestirelim.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Kuruma Beklentisi
              </p>
              <p className="mt-3 text-3xl font-black text-white">4-6 saat</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-200">
                Kumas turu ve ortam sicakligina gore degisir. Hizmet sonunda net kullanim bilgilendirmesi veriyoruz.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <a
            href={CONTACT_INFO.phoneLink}
            data-analytics-source="hero_call"
            title="NisanProClean telefon ile hemen ara"
            className="group relative overflow-hidden flex items-center justify-center gap-3 bg-white text-background-dark px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
          >
            <span className="relative z-10">{CONTACT_INFO.phone}</span>
            <span className="material-symbols-outlined transition-transform group-hover:rotate-12 relative z-10">
              call
            </span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent animate-shine z-0" />
          </a>
          <a
            href={CONTACT_INFO.instagram}
            target="_blank"
            rel="nofollow noopener noreferrer"
            title="NisanProClean Instagram sayfasini ac"
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-lg text-white border border-white/20 hover:bg-white/5 transition-all duration-300 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined">photo_camera</span>
            <span>Instagram'da Bizi Izleyin</span>
          </a>
        </div>

        <div className="flex items-center gap-3 mt-6 text-sm text-gray-400">
          <div className="flex text-yellow-500">
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
            <span className="material-symbols-outlined text-[16px] font-solid">star</span>
          </div>
          <span>Afyon genelinde yerinde hizmet, net fiyat ve hizli geri donus</span>
        </div>

        <div className="hidden w-full max-w-3xl gap-3 lg:grid lg:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-red-500/35 bg-background-dark/72 p-4 backdrop-blur-sm">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <span className="material-symbols-outlined">gavel</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">7 gun memnuniyet garantisi</p>
              <p className="text-xs text-gray-300">Kosulsuz destek ve guvence</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-green-500/35 bg-background-dark/72 p-4 backdrop-blur-sm">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-500/20 text-green-400">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Hassas yuzey guvencesi</p>
              <p className="text-xs text-gray-300">Kumas turune uygun, kontrollu ve guvenli uygulama</p>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#features"
        onClick={scrollToNextSection}
        data-analytics-source="hero_scroll_hint"
        title="Bir sonraki bolume kaydir"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 inline-flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors"
      >
        <span className="text-[10px] tracking-[0.24em] font-semibold uppercase animate-pulse">Asagi Kaydir</span>
        <span className="material-symbols-outlined text-4xl animate-bounce">keyboard_arrow_down</span>
      </a>
    </header>
  );
};

export default Hero;
