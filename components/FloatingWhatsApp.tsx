import React from "react";
import { CONTACT_INFO } from "../constants";

const FloatingWhatsApp: React.FC = () => {
  const message = encodeURIComponent(
    "Merhaba, NisanProClean icin fiyat ve randevu bilgisi almak istiyorum."
  );

  return (
    <a
      href={`${CONTACT_INFO.whatsappLink}?text=${message}`}
      data-analytics-source="floating_whatsapp"
      target="_blank"
      rel="nofollow noopener noreferrer"
      title="WhatsApp ile fiyat ve randevu al"
      className="group fixed bottom-6 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_16px_34px_rgba(37,211,102,0.38)] md:right-6"
      aria-label="WhatsApp ile fiyat ve randevu alin"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-8">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-2.846-.848-.919-.386-1.526-1.297-1.603-1.407-.076-.11-1.007-1.286-1.007-2.422 0-1.136.631-1.694.853-1.919.224-.225.465-.282.619-.282.155 0 .31.003.45.003.141.001.328-.052.513.385.188.441.643 1.558.697 1.673.054.115.088.249.014.4-.074.153-.112.247-.222.378-.11.13-.23.272-.328.368-.11.109-.224.226-.096.446.128.219.57.928 1.222 1.508.826.736 1.526.967 1.742 1.077.216.11.344.093.473-.046.129-.14.549-.636.696-.855.147-.219.294-.183.496-.108.201.076 1.272.6 1.489.709.217.109.361.163.415.257.054.095.054.547-.09 1.953z" />
      </svg>

      <div className="pointer-events-none absolute right-full top-1/2 mr-4 hidden -translate-y-1/2 items-center gap-2 rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm font-bold whitespace-nowrap text-gray-900 opacity-0 shadow-xl transition-opacity duration-300 md:flex md:group-hover:opacity-100">
        <span className="material-symbols-outlined text-lg text-[#25D366]">chat</span>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-500">WhatsApp destek</span>
          <span className="text-sm">Fiyat ve randevu al</span>
        </div>
        <div className="absolute top-1/2 -right-2 -translate-y-1/2 border-8 border-transparent border-l-white"></div>
      </div>
    </a>
  );
};

export default FloatingWhatsApp;
