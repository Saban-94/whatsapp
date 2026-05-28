import React from 'react';

export default function DoodleBackground() {
  return (
    <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none z-0 overflow-hidden" style={{ backgroundColor: '#efeae2' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="whatsapp-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* Simple repeated SVG doodles resembling speech bubbles, stars, phones, code, etc. */}
            <path d="M 10 10 Q 15 5 20 10 Q 25 15 20 20 Q 15 25 10 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 40 10 L 45 15 L 43 25 L 37 25 L 35 15 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="65" cy="15" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="68" cy="18" r="2" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 20 40 H 30 V 50 H 20 Z M 25 40 V 50" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 50 45 C 55 45, 60 48, 60 52 C 60 56, 52 58, 48 55" fill="none" stroke="currentColor" strokeWidth="1" />
            {/* Tiny stars and dots */}
            <circle cx="15" cy="65" r="1.5" fill="currentColor" />
            <circle cx="55" cy="65" r="1" fill="currentColor" />
            <circle cx="35" cy="35" r="1.5" fill="currentColor" />
            <path d="M 50 30 L 52 35 L 57 35 L 53 38 L 55 43 L 50 40 L 45 43 L 47 38 L 43 35 L 48 35 Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#whatsapp-pattern)" />
      </svg>
    </div>
  );
}
