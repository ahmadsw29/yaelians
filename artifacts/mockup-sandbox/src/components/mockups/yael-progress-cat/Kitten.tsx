import React, { useState } from 'react';
import './_group.css';

function MashmashKitten({ jumpKey }: { jumpKey: number }) {
  return (
    <svg
      key={jumpKey}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={jumpKey ? 'is-jumping' : undefined}
    >
      <path d="M72 71 Q94 76 91 57 Q90 49 82 50" fill="none" stroke="#eea15d" strokeWidth="8" strokeLinecap="round" />
      <path d="M29 72 Q28 60 33 57 L67 57 Q72 62 71 76 L68 91 Q61 96 54 91 L49 89 Q43 96 34 91Z" fill="#f2ae67" stroke="#b97845" strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="80" rx="14" ry="13" fill="#ffe2ba" />
      <path d="M25 42 L22 12 Q22 7 27 11 L45 27 Q51 25 56 27 L74 11 Q79 7 78 13 L75 44" fill="#f7bd7d" stroke="#b97845" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M29 31 L27 18 L40 29 M61 29 L74 18 L72 33" fill="#ef9d9b" />
      <ellipse cx="50" cy="49" rx="35" ry="31" fill="#f7bd7d" stroke="#b97845" strokeWidth="2.5" />
      <ellipse cx="37" cy="51" rx="8.5" ry="10.5" fill="#fffaf0" />
      <ellipse cx="63" cy="51" rx="8.5" ry="10.5" fill="#fffaf0" />
      <ellipse cx="38" cy="53" rx="4.8" ry="6.7" fill="#413a37" />
      <ellipse cx="62" cy="53" rx="4.8" ry="6.7" fill="#413a37" />
      <circle cx="39.5" cy="50" r="2" fill="white" />
      <circle cx="63.5" cy="50" r="2" fill="white" />
      <ellipse cx="27" cy="63" rx="6" ry="3.2" fill="#e99591" opacity=".7" />
      <ellipse cx="73" cy="63" rx="6" ry="3.2" fill="#e99591" opacity=".7" />
      <path d="M47 61 Q50 58 53 61 L50 64Z" fill="#d87978" />
      <path d="M50 64 Q47 69 44 66 M50 64 Q53 69 56 66" fill="none" stroke="#684739" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 61 L9 59 M19 66 L10 68 M82 61 L91 59 M81 66 L90 68" fill="none" stroke="#a97958" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M31 76 Q50 86 69 76 L65 84 Q50 91 35 84Z" fill="#4c9a88" stroke="#377669" strokeWidth="1.5" />
      <path d="M61 83 L70 87 L63 92Z" fill="#ed8c75" />
      <ellipse cx="38" cy="90" rx="8" ry="4" fill="#f7bd7d" stroke="#b97845" strokeWidth="1.5" />
      <ellipse cx="63" cy="90" rx="8" ry="4" fill="#f7bd7d" stroke="#b97845" strokeWidth="1.5" />
    </svg>
  );
}

export function Kitten() {
  const [question, setQuestion] = useState(8);
  const [jumpKey, setJumpKey] = useState(0);
  const progress = Math.min((question / 20) * 100, 96);

  const answerCorrectly = () => {
    setQuestion((current) => Math.min(current + 1, 20));
    setJumpKey((current) => current + 1);
  };

  return (
    <main className="yael-demo" dir="rtl">
      <section className="yael-card">
        <div className="yael-topline">
          <span>تدريب المفردات · ٢٠ كلمة</span>
          <span className="yael-count">{question} / 20</span>
        </div>
        <div className="yael-track-area">
          <div className="yael-track">
            <div className="yael-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="yael-new-mascot" style={{ left: `${progress}%` }}>
            <MashmashKitten jumpKey={jumpKey} />
          </div>
        </div>
        <p className="yael-question">اختر معنى الكلمة</p>
        <button className="yael-action" onClick={answerCorrectly}>أجبت إجابة صحيحة ✓</button>
        <p className="yael-helper">جرّب الزر لترى مشمش يقفز ويتقدّم.</p>
      </section>
    </main>
  );
}
