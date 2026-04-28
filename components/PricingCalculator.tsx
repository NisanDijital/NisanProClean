import React, { useMemo, useState } from "react";
import { trackWhatsAppClick } from "../analytics";
import { CONTACT_INFO } from "../constants";
import { sendLeadToAgent } from "../apiClient";

type PricedItem = {
  id: string;
  name: string;
  price: number;
};

const PRICING: Record<string, PricedItem[]> = {
  koltuk: [
    { id: "maxiTakim", name: "Maxi Takim", price: 3000 },
    { id: "megaKose", name: "U / Buyuk Kose Takimi", price: 3000 },
    { id: "chesterTakim", name: "Chester Koltuk Takimi", price: 2500 },
    { id: "minderliTakim", name: "Minderli Koltuk Takimi", price: 2500 },
    { id: "duzTakim", name: "Duz Koltuk Takimi", price: 2000 },
    { id: "takim3211", name: "3+2+1+1 Takim", price: 1800 },
    { id: "buyukLKoltuk", name: "L Koltuk (Buyuk)", price: 1250 },
    { id: "ucluKoltuk", name: "Uclu Koltuk", price: 750 },
    { id: "ikiliKoltuk", name: "Ikili Koltuk", price: 550 },
    { id: "tekliKoltuk", name: "Tekli Koltuk / Berjer", price: 350 },
    { id: "sandalye", name: "Ev Sandalyesi (Adet)", price: 200 },
  ],
  yatak: [
    { id: "ciftYatak", name: "Cift Kisilik Yatak", price: 1750 },
    { id: "tekYatak", name: "Tek Kisilik Yatak", price: 1000 },
    { id: "bazaBasligi", name: "Baza Basligi", price: 500 },
  ],
  arac: [
    { id: "aracKoltugu", name: "Binek Arac Koltugu", price: 2000 },
    { id: "suvArac", name: "SUV / Ticari Arac Koltugu", price: 2500 },
  ],
};

const ADDONS: PricedItem[] = [
  { id: "buhar", name: "Sicak Buhar Dezenfeksiyonu", price: 300 },
  { id: "leke", name: "Ozel Leke Cikarma", price: 500 },
  { id: "pet", name: "Evcil Hayvan Koku Giderici", price: 250 },
];

const TIME_SLOTS = [
  "09:00 - 12:00",
  "13:00 - 16:00",
  "17:00 - 20:00",
];

const currency = (value: number) => `${value.toLocaleString("tr-TR")} TL`;
const normalizePhone = (value: string) => value.replace(/\D/g, "");

const PricingCalculator: React.FC = () => {
  const [items, setItems] = useState<Record<string, number>>({});
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "sending" | "saved" | "failed">("idle");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isGuaranteeModalOpen, setIsGuaranteeModalOpen] = useState(false);

  const updateItem = (id: string, delta: number) => {
    setItems((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const clone = { ...prev };
        delete clone[id];
        return clone;
      }
      return { ...prev, [id]: next };
    });
  };

  const toggleAddon = (id: string) => {
    setAddons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { total, summary } = useMemo(() => {
    const nextSummary: { name: string; qty: number; total: number }[] = [];
    let nextTotal = 0;

    Object.values(PRICING).forEach((group) => {
      group.forEach((item) => {
        const qty = items[item.id] || 0;
        if (!qty) return;
        const lineTotal = qty * item.price;
        nextTotal += lineTotal;
        nextSummary.push({ name: item.name, qty, total: lineTotal });
      });
    });

    ADDONS.forEach((addon) => {
      if (!addons[addon.id]) return;
      nextTotal += addon.price;
      nextSummary.push({ name: addon.name, qty: 1, total: addon.price });
    });

    return { total: nextTotal, summary: nextSummary };
  }, [addons, items]);

  const canSubmitLead =
    customerName.trim().length >= 2 &&
    normalizePhone(customerPhone).length >= 10 &&
    customerAddress.trim().length >= 5;

  const handleWhatsAppOrder = async () => {
    if (!summary.length || !acceptedTerms || !canSubmitLead) return;

    const lines = summary.map((item) => `- ${item.qty}x ${item.name}: ${currency(item.total)}`);
    const dateLine = date
      ? `Tarih: ${date.split("-").reverse().join(".")}\nSaat: ${time}`
      : "Tarih: En kisa surede uygun zaman\nSaat: Fark etmez";

    const message = [
      "Merhaba, web sitenizden fiyat hesaplamasi yaptim ve randevu almak istiyorum.",
      "",
      "*Sectigim Hizmetler*",
      ...lines,
      "",
      `*Toplam Tutar*`,
      currency(total),
      "",
      "*Musteri Bilgileri*",
      `Ad Soyad: ${customerName.trim()}`,
      `Telefon: ${customerPhone.trim()}`,
      `Adres: ${customerAddress.trim()}`,
      "",
      "*Talep Edilen Randevu*",
      dateLine,
      "",
      "Musaitlik durumunu paylasir misiniz?",
    ].join("\n");

    const encodedMessage = encodeURIComponent(message);
    trackWhatsAppClick("pricing_calculator", {
      selected_items: summary.length,
      total,
      has_date: Boolean(date),
      time_slot: time,
    });

    setLeadStatus("sending");
    const leadSaved = await sendLeadToAgent({
      name: customerName.trim(),
      phone: customerPhone.trim(),
      address: customerAddress.trim(),
      service: summary.map((item) => item.name).join(", "),
      date: date || "esnek",
      slot: time,
      source: "web_pricing_calculator",
    });
    setLeadStatus(leadSaved ? "saved" : "failed");

    window.open(`${CONTACT_INFO.whatsappLink}?text=${encodedMessage}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section id="fiyat-hesapla" className="py-24 px-4 relative scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm mb-4">
            <span className="material-symbols-outlined text-sm">calculate</span>
            Seffaf Fiyatlandirma
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Kendi Fiyatinizi <span className="text-gradient-primary">Hesaplayin</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Ihtiyaciniz olan hizmetleri secin, tahmini toplami gorun ve uygun saat blogunu secip WhatsApp uzerinden randevu isteyin.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3 space-y-8">
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">chair</span>
                Koltuk ve Sandalye
              </h3>
              <div className="space-y-4">
                {PRICING.koltuk.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div>
                      <div className="text-white font-medium">{item.name}</div>
                      <div className="text-primary text-sm">{currency(item.price)}</div>
                    </div>
                    <div className="flex items-center gap-4 bg-background-dark rounded-lg p-1 border border-white/10">
                      <button
                        onClick={() => updateItem(item.id, -1)}
                        className="size-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="text-white font-bold w-4 text-center">{items[item.id] || 0}</span>
                      <button
                        onClick={() => updateItem(item.id, 1)}
                        className="size-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">bed</span>
                  Yatak Yikama
                </h3>
                <div className="space-y-4">
                  {PRICING.yatak.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div>
                        <div className="text-white font-medium text-sm">{item.name}</div>
                        <div className="text-secondary text-xs">{currency(item.price)}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-background-dark rounded-lg p-1 border border-white/10">
                        <button onClick={() => updateItem(item.id, -1)} className="size-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md">
                          <span className="material-symbols-outlined text-xs">remove</span>
                        </button>
                        <span className="text-white font-bold w-3 text-center text-sm">{items[item.id] || 0}</span>
                        <button onClick={() => updateItem(item.id, 1)} className="size-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md">
                          <span className="material-symbols-outlined text-xs">add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">directions_car</span>
                  Arac Koltuk Temizligi
                </h3>
                <div className="space-y-4">
                  {PRICING.arac.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div>
                        <div className="text-white font-medium text-sm">{item.name}</div>
                        <div className="text-secondary text-xs">{currency(item.price)}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-background-dark rounded-lg p-1 border border-white/10">
                        <button onClick={() => updateItem(item.id, -1)} className="size-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md">
                          <span className="material-symbols-outlined text-xs">remove</span>
                        </button>
                        <span className="text-white font-bold w-3 text-center text-sm">{items[item.id] || 0}</span>
                        <button onClick={() => updateItem(item.id, 1)} className="size-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-md">
                          <span className="material-symbols-outlined text-xs">add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                Ekstra Koruma ve Hijyen
              </h3>
              <p className="text-gray-400 text-sm mb-6">Temizligin omrunu uzatan ek dokunuslar.</p>

              <div className="grid md:grid-cols-2 gap-4">
                {ADDONS.map((addon) => (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex items-start gap-3 ${
                      addons[addon.id]
                        ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                        : "bg-surface-dark border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div
                      className={`mt-1 size-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        addons[addon.id] ? "bg-primary border-primary text-background-dark" : "border-gray-500 text-transparent"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{addon.name}</div>
                      <div className="text-primary text-sm font-bold mt-2">+{currency(addon.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-1/3">
            <div className="glass-card p-6 rounded-2xl border border-white/10 sticky top-28">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Siparis Ozeti</h3>

              {summary.length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl opacity-50">shopping_cart</span>
                  <p>Henuz bir hizmet secmediniz.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6 max-h-[280px] overflow-y-auto pr-2">
                    {summary.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="text-gray-300">
                          <span className="text-white font-bold mr-2">{item.qty}x</span>
                          {item.name}
                        </div>
                        <div className="text-white font-medium whitespace-nowrap ml-4">{currency(item.total)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-4 mb-6">
                    <div className="flex justify-between items-end">
                      <div className="text-white font-bold text-sm">Toplam</div>
                      <div className="text-3xl font-black text-primary">{currency(total)}</div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Fiyatlar tahmini olup yerinde yapilacak net tespite gore kucuk degisiklikler gosterebilir.
                    </p>
                  </div>

                  <div className="bg-background-dark border border-white/10 rounded-xl p-4 mb-6">
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
                      Randevu Tercihiniz
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Tarih Secin</label>
                        <input
                          type="date"
                          min={new Date().toISOString().split("T")[0]}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Saat Blogu</label>
                        <div className="grid gap-2">
                          {TIME_SLOTS.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setTime(slot)}
                              className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                                time === slot
                                  ? "border-primary bg-primary/10 text-white"
                                  : "border-white/10 bg-surface-dark text-gray-300 hover:border-white/30"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background-dark border border-white/10 rounded-xl p-4 mb-6">
                    <h4 className="text-white font-bold text-sm mb-3">Musteri Bilgileri</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ad Soyad"
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Telefon (05xx xxx xx xx)"
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <textarea
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Adres"
                        rows={2}
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    {!canSubmitLead && (
                      <p className="text-xs text-amber-300 mt-2">Randevu gondermek icin ad, telefon ve adres girin.</p>
                    )}
                    {leadStatus === "saved" && (
                      <p className="text-xs text-emerald-300 mt-2">Lead kaydi alindi. WhatsApp mesaji da aciliyor.</p>
                    )}
                    {leadStatus === "failed" && (
                      <p className="text-xs text-amber-300 mt-2">Lead kaydi su an alinamadi, WhatsApp uzerinden devam edebilirsiniz.</p>
                    )}
                  </div>

                  <div className="mb-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-background-dark text-primary focus:ring-primary focus:ring-offset-background-dark cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer select-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsGuaranteeModalOpen(true);
                        }}
                        className="text-primary hover:underline font-medium"
                      >
                        Hizmet ve Garanti Sartlarini
                      </button>{" "}
                      okudum, anladim ve kabul ediyorum.
                    </label>
                  </div>

                  <button
                    onClick={handleWhatsAppOrder}
                    disabled={!acceptedTerms || !canSubmitLead || leadStatus === "sending"}
                    className={`relative overflow-hidden w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg ${
                      acceptedTerms && canSubmitLead && leadStatus !== "sending"
                        ? "bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <span className="material-symbols-outlined relative z-10">chat</span>
                    <span className="relative z-10">{leadStatus === "sending" ? "Kayit Aliniyor..." : "WhatsApp'tan Randevu Al"}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isGuaranteeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-dark border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full relative max-h-[90vh] flex flex-col shadow-2xl">
            <button
              onClick={() => setIsGuaranteeModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-background-dark rounded-full p-1 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10 shrink-0">
              <div className="size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">gavel</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Hizmet ve Garanti Sartlari</h3>
                <p className="text-gray-400 text-xs">NisanProClean musteri bilgilendirme metni</p>
              </div>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar text-sm text-gray-300 space-y-6">
              <section>
                <h4 className="text-white font-bold mb-2">1. Hizmetin Kapsami</h4>
                <p className="leading-relaxed">
                  Yerinde temizlik hizmeti, kumas turune uygun ekipman ve profesyonel urunlerle uygulanir. Leke cikarma sureci, yuzeye zarar vermeden alinabilecek en iyi sonuca gore planlanir.
                </p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2">2. Musteri Bilgilendirmesi</h4>
                <p className="leading-relaxed">
                  Daha once kimyasal mudahale gormus, sabitlenmis veya yuzeye zarar vermis lekelerin tamamen cikmasi garanti edilemez. Ekibimiz islem oncesi bu konuda net bilgilendirme yapar.
                </p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2">3. Memnuniyet Destegi</h4>
                <p className="leading-relaxed">
                  Hizmet sonrasi bariz bir eksiklik oldugunu dusunuyorsaniz kisa sure icinde bize ulasabilirsiniz. Durum tekrar incelenir ve gerekiyorsa destek planlanir.
                </p>
              </section>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 shrink-0">
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setIsGuaranteeModalOpen(false);
                }}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary/20"
              >
                Okudum ve Kabul Ediyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PricingCalculator;
