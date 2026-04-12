import React from 'react';
import { FAQ_ITEMS } from '../constants';

const FAQ: React.FC = () => {
  return (
    <section className="py-24 px-4 relative border-t border-white/5 bg-gradient-to-b from-background-dark to-surface-dark/30">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-primary font-bold tracking-widest text-sm uppercase mb-3 block">Merak Ettikleriniz</span>
          <h2 className="text-3xl md:text-5xl font-bold text-white">Sıkça Sorulan Sorular</h2>
        </div>

        <div className="flex flex-col gap-4">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className="glass border border-white/5 rounded-2xl overflow-hidden group hover:border-primary/30 transition-colors">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer select-none">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{item.question}</h3>
                  <span className="material-symbols-outlined text-gray-400 transform group-open:rotate-180 transition-transform duration-300">
                    expand_more
                  </span>
                </summary>
                <div className="px-6 pb-6 text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                  {item.answer}
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;