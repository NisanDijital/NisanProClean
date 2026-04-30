import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "config", "gbp.profile.json");
const docsDir = path.join(root, "docs");
const reportsDir = path.join(root, "reports", "gbp");

const now = new Date();
const dateTag = now.toISOString().slice(0, 10);
const stamp = now.toISOString().replace(/[:.]/g, "-");

async function main() {
  const raw = await fs.readFile(configPath, "utf8");
  const cfg = JSON.parse(raw);

  await fs.mkdir(docsDir, { recursive: true });
  await fs.mkdir(reportsDir, { recursive: true });

  const launchDocPath = path.join(docsDir, `gbp-launch-kit-${dateTag}-auto.md`);
  const verifyPath = path.join(reportsDir, `${stamp}-gbp-verify-checklist.md`);
  const jsonOutPath = path.join(reportsDir, `${stamp}-gbp-payload.json`);

  const categoryLines = [
    `- Ana kategori: \`${cfg.mainCategory}\``,
    ...cfg.additionalCategories.map((x, i) => `- Ek kategori ${i + 1}: \`${x}\``),
  ];

  const servicesLines = cfg.services
    .map((s, i) => `${i + 1}. ${s.name}\n: ${s.description}`)
    .join("\n");

  const qaLines = cfg.qa
    .map((item) => `Soru: ${item.question}\nCevap: ${item.answer}`)
    .join("\n\n");

  const areas = cfg.serviceAreas.map((x, i) => `${i + 1}. ${x}`).join("\n");

  const launchDoc = `# GBP Launch Kit (Auto) - ${dateTag}

## 1) Isletme Temel Bilgileri

- Isletme adi: \`${cfg.businessName}\`
- Telefon (display): \`${cfg.phoneDisplay}\`
- Telefon (intl): \`${cfg.phoneIntl}\`
- Website: \`${cfg.website}\`
- Isletme modeli: \`Service-area business\` (adres gizli)
${categoryLines.join("\n")}

## 2) Hizmet Bolgesi

${areas}

## 3) Calisma Saatleri

- Pazartesi: ${cfg.hours.monday}
- Sali: ${cfg.hours.tuesday}
- Carsamba: ${cfg.hours.wednesday}
- Persembe: ${cfg.hours.thursday}
- Cuma: ${cfg.hours.friday}
- Cumartesi: ${cfg.hours.saturday}
- Pazar: ${cfg.hours.sunday}

## 4) Isletme Aciklamasi

${cfg.description}

## 5) Hizmetler

${servicesLines}

## 6) Ilk 5 Q&A

${qaLines}

## 7) UTM Linkler

- Website: ${cfg.website}?utm_source=google&utm_medium=organic&utm_campaign=gbp
- Randevu: ${cfg.website}#fiyat-hesapla?utm_source=google&utm_medium=organic&utm_campaign=gbp_randevu

## 8) Dogrulama Sonrasi Kontrol

1. Isim dogru mu: ${cfg.businessName}
2. Telefon dogru mu: ${cfg.phoneIntl}
3. Website aciliyor mu
4. Hizmet bolgesi listesi tam mi
5. Saatler yayinlandi mi
6. En az 10 gorsel yuklendi mi
7. Ilk post yayina alindi mi
`;

  const verifyDoc = `# GBP Verify Checklist - ${stamp}

- [ ] Google dogrulamasi tamamlandi
- [ ] Isletme adi dogru: ${cfg.businessName}
- [ ] Telefon dogru: ${cfg.phoneIntl}
- [ ] Website dogru: ${cfg.website}
- [ ] Ana kategori dogru: ${cfg.mainCategory}
- [ ] Servis bolgeleri tam girildi (${cfg.serviceAreas.length} adet)
- [ ] Saatler tam girildi
- [ ] Aciklama eklendi
- [ ] Hizmetler eklendi
- [ ] Q&A eklendi
- [ ] 10+ gorsel yuklendi
- [ ] Profil URL alindi (sonraki adim: schema sameAs baglantisi)
`;

  await fs.writeFile(launchDocPath, `${launchDoc}\n`, "utf8");
  await fs.writeFile(verifyPath, `${verifyDoc}\n`, "utf8");
  await fs.writeFile(jsonOutPath, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");

  console.log(`LAUNCH_DOC=${launchDocPath}`);
  console.log(`VERIFY_CHECKLIST=${verifyPath}`);
  console.log(`PAYLOAD_JSON=${jsonOutPath}`);
}

main().catch((err) => {
  console.error(`gbp-bootstrap failed: ${err.message}`);
  process.exit(1);
});
