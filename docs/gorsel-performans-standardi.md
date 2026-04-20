# Gorsel Performans Standardi

Bu standart canli sitede gorsel kaynakli LCP/CLS sorunlarini azaltmak icin uygulanir.

## Zorunlu kurallar

1. Tum `img` etiketlerinde `width` ve `height` ver.
2. Hero harici tum gorsellerde `loading="lazy"` ve `decoding="async"` kullan.
3. Hero gorselinde `fetchPriority="high"` ve `srcset + sizes` zorunlu.
4. Uzak gorsellerde `referrerPolicy="no-referrer"` kullan.
5. Unsplash URL'lerinde kalite ve boyut siniri kullan:
   - Hero: `q=60-64`, `w=768/1280/1920` srcset
   - Kart/blog: `q=70-80`, hedef kart boyutuna uygun `w`
6. Ust bolumde gorunen gorseller icin `preconnect` ve gerekiyorsa `preload` uygula.

## Hedef metrikler

- Mobil LCP: < 2.5s
- CLS: < 0.1
- Ana bundle sonrasi ilk etkileşimde scroll jank olmamasi

## Kontrol listesi

- [ ] Yeni eklenen her gorselde width/height var
- [ ] Hero gorseli srcset/sizes ile responsive
- [ ] Lazy olmayan gorseller yalnizca ilk ekran kritik alaninda
- [ ] Lighthouse raporunda "Improve image delivery" uyarisi belirgin dusmus
