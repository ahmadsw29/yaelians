import { useState } from 'react';
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import './_group.css';

const tips = [
  'أنا مِشمِش، رفيقك في التعلّم. خطوة صغيرة كل مرة!',
  'اقرأ الجملة كاملة قبل اختيار الإجابة.',
  'الخطأ فرصة للتعلّم، وليس سببًا للتوقّف.',
  'ابحث عن دليل في النص، ولا تعتمد على التخمين وحده.',
];
const kittenInk = { fur: '#f4b66f', inner: '#e98f91', outline: '#9d6848', face: '#493a30', cream: '#fff0d9', scarf: '#4c9a88' };

function MashmashArt({ size = 76 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="شخصية مشمش القط">
      <path d="M72 71 Q94 76 91 57 Q90 49 82 50" fill="none" stroke={kittenInk.fur} strokeWidth="8" strokeLinecap="round" />
      <path d="M29 72 Q28 60 33 57 L67 57 Q72 62 71 76 L68 91 Q61 96 54 91 L49 89 Q43 96 34 91Z" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="80" rx="14" ry="13" fill={kittenInk.cream} />
      <path d="M25 42 L22 12 Q22 7 27 11 L45 27 Q51 25 56 27 L74 11 Q79 7 78 13 L75 44" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M29 31 L27 18 L40 29 M61 29 L74 18 L72 33" fill={kittenInk.inner} />
      <ellipse cx="50" cy="49" rx="35" ry="31" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="2.5" />
      <path d="M44 25 Q50 31 56 25 M47 23L50 27L53 23" fill="none" stroke="#da9958" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="37" cy="51" rx="8.5" ry="10.5" fill={kittenInk.cream} />
      <ellipse cx="63" cy="51" rx="8.5" ry="10.5" fill={kittenInk.cream} />
      <ellipse cx="38" cy="53" rx="4.8" ry="6.7" fill={kittenInk.face} />
      <ellipse cx="62" cy="53" rx="4.8" ry="6.7" fill={kittenInk.face} />
      <circle cx="39.5" cy="50" r="2" fill="#fff" />
      <circle cx="63.5" cy="50" r="2" fill="#fff" />
      <ellipse cx="27" cy="63" rx="6" ry="3.2" fill={kittenInk.inner} opacity=".7" />
      <ellipse cx="73" cy="63" rx="6" ry="3.2" fill={kittenInk.inner} opacity=".7" />
      <path d="M47 61 Q50 58 53 61 L50 64Z" fill={kittenInk.inner} />
      <path d="M50 64 Q47 69 44 66 M50 64 Q53 69 56 66" fill="none" stroke={kittenInk.face} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 61 L9 59 M19 66 L10 68 M82 61 L91 59 M81 66 L90 68" fill="none" stroke={kittenInk.outline} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M31 76 Q50 86 69 76 L65 84 Q50 91 35 84Z" fill={kittenInk.scarf} stroke="#377669" strokeWidth="1.5" />
      <path d="M61 83 L70 87 L63 92Z" fill="#ed8c75" />
      <ellipse cx="38" cy="90" rx="8" ry="4" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="1.5" />
      <ellipse cx="63" cy="90" rx="8" ry="4" fill={kittenInk.fur} stroke={kittenInk.outline} strokeWidth="1.5" />
    </svg>
  );
}

export function Current() {
  const [tip, setTip] = useState(0);
  const [hidden, setHidden] = useState(false);

  return (
    <main dir="rtl" className="ya-current-screen">
      <header className="ya-current-heading">
        <span className="ya-current-kicker">التدريب على ياعيل</span>
        <h1>المعلّم الحالي</h1>
        <p>الشخصية التي ترافقك أثناء التدرّب.</p>
      </header>
      {!hidden ? (
        <section className="ya-current-card">
          <div className="ya-current-cat"><MashmashArt /></div>
          <div className="ya-current-copy">
            <div className="ya-current-eyebrow"><BookOpen size={15} /> رفيق التعلّم</div>
            <p>{tips[tip]}</p>
          </div>
          <button type="button" className="ya-current-action" onClick={() => setTip((tip + 1) % tips.length)}>
            <Sparkles size={16} /> نصيحة جديدة
          </button>
        </section>
      ) : (
        <button className="ya-current-show" type="button" onClick={() => setHidden(false)}>إظهار مشمش</button>
      )}
      <div className="ya-current-note">
        <span><ArrowLeft size={16} /> السلوك الحالي</span>
        <p>يتفاعل مع الإجابات الصحيحة والخاطئة ويظهر في شاشة التدريب.</p>
      </div>
    </main>
  );
}
