import React from 'react';
import './_group.css';

function CurrentCat() {
  return (
    <svg className="yael-current-cat" viewBox="0 0 100 110" aria-hidden="true">
      <path d="M78 84 Q102 60 89 55" fill="none" stroke="#efb879" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="49" cy="82" rx="27" ry="23" fill="#efb879" />
      <path d="M18 48 L15 13 L39 27 Q51 22 65 27 L87 13 L83 49Z" fill="#efb879" />
      <path d="M23 31 L22 22 L34 30 M70 31 L81 22 L79 35" fill="#e29383" />
      <ellipse cx="50" cy="50" rx="35" ry="27" fill="#efb879" />
      <path d="M29 47 Q36 39 43 47 M57 47 Q64 39 72 47" stroke="#493a30" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M44 60 Q50 70 58 60Z" fill="#493a30" />
      <ellipse cx="52" cy="67" rx="4" ry="3" fill="#e29383" />
      <path d="M15 51L8 45 M85 51L92 45 M18 60L11 61 M82 60L89 61" stroke="#fff3da" strokeWidth="3" strokeLinecap="round" />
      <path d="M47 54L54 54L50 58Z" fill="#e29383" />
      <rect x="28" y="78" width="44" height="23" rx="4" fill="#17665c" />
      <path d="M50 81V99 M33 84H45 M55 84H67" stroke="#fff3da" strokeWidth="2" />
    </svg>
  );
}

export function Current() {
  return (
    <main className="yael-demo" dir="rtl">
      <section className="yael-card">
        <div className="yael-topline">
          <span>تدريب المفردات · ٢٠ كلمة</span>
          <span className="yael-count">8 / 20</span>
        </div>
        <div className="yael-track-area">
          <div className="yael-track"><div className="yael-fill" style={{ width: '40%' }} /></div>
        </div>
        <p className="yael-question">اختر معنى الكلمة</p>
        <div className="yael-answer">
          <span className="yael-check">✓</span>
          <span className="yael-answer-copy">فكرة أو معنى واضح</span>
          <CurrentCat />
        </div>
      </section>
    </main>
  );
}
