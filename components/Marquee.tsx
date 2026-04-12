import React from 'react';
import { MARQUEE_ITEMS } from '../constants';

const Marquee: React.FC = () => {
  // Duplicate items to ensure smooth infinite scroll
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <section className="py-12 border-y border-white/5 bg-surface-dark/50 relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background-dark to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background-dark to-transparent z-10 pointer-events-none"></div>
      
      <div className="flex gap-16 animate-marquee whitespace-nowrap opacity-60 hover:opacity-100 transition-opacity duration-500 text-primary/80">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="material-symbols-outlined text-primary">{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Marquee;