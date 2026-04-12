import React, { useState, useEffect } from 'react';

const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div className={`fixed bottom-8 right-8 z-40 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
      <button
        onClick={scrollToTop}
        className="size-12 rounded-full bg-primary text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center hover:bg-cyan-600 hover:-translate-y-1 transition-all duration-300 border border-white/10 group"
        aria-label="Scroll to top"
      >
        <span className="material-symbols-outlined group-hover:animate-bounce">arrow_upward</span>
      </button>
    </div>
  );
};

export default ScrollToTop;