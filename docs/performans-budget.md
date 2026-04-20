# Performans Budget

Bu proje build sonrasinda asagidaki limitleri otomatik kontrol eder:

- `index.html` <= 12 KB
- `assets/index-*.css` <= 90 KB
- `assets/index-*.js` <= 260 KB
- Tum JS chunk toplami <= 420 KB
- `dist/index.html` icindeki 3rd-party script sayisi <= 2

## Komut

```bash
npm run build
npm run perf:budget
```

## Neden

- Mobilde ilk acilis gecikmesini dusurmek
- Script sismesini erken yakalamak
- 3rd-party script ekleme disiplinini korumak
