import { useState } from 'react';
import { ArrowLeft, ArrowUpLeft, BookOpen, Check, Flame, RotateCw, Sparkles } from 'lucide-react';
import './tutor-celebration.css';

type Celebration = {
  id: string;
  label: string;
  title: string;
  detail: string;
  mark: 'streak' | 'accuracy' | 'milestone';
};

const celebrations: Celebration[] = [
  {
    id: 'streak',
    label: 'ثبات',
    title: 'أنهيتَ الجولة بثبات',
    detail: 'ثلاثة أيام من التقدّم المتواصل.',
    mark: 'streak',
  },
  {
    id: 'accuracy',
    label: 'دقّة',
    title: 'إجاباتك صارت أدقّ',
    detail: 'قرأتَ السؤال بتركيز واخترتَ بثقة.',
    mark: 'accuracy',
  },
  {
    id: 'milestone',
    label: 'إنجاز',
    title: 'خطوة جديدة نحو هدفك',
    detail: 'كل جولة تقرّبك من اختبار ياعيل.',
    mark: 'milestone',
  },
];

function TutorPortrait({ active }: { active: string }) {
  return (
    <svg className={`tc-tutor tc-tutor--${active}`} viewBox="0 0 190 218" role="img" aria-label="رامي، معلّمك في التدريب">
      <ellipse cx="99" cy="202" rx="66" ry="9" fill="#172a25" opacity=".17" />
      <path d="M40 210c4-46 24-67 58-67s57 21 60 67H40Z" fill="#e7a15e" />
      <path d="M54 211c3-35 15-57 45-62l12 18 13-18c19 6 30 25 34 62H54Z" fill="#344e49" />
      <path d="m84 149 15 20 14-20 9 9-13 24H91l-15-24 8-9Z" fill="#f6e6c8" />
      <path d="M77 105h43v43c-6 11-14 16-22 16-9 0-16-6-21-16v-43Z" fill="#b87955" />
      <path d="M67 77c0-27 13-43 33-43 23 0 37 16 37 44v19c0 29-17 46-37 46-19 0-33-18-33-46V77Z" fill="#c78b67" />
      <path d="M66 86c-7-29 8-55 32-58 17-3 36 5 42 25 6 18-1 34-2 40-4-7-7-15-7-25-14 7-35 9-57 5-1 11-2 20-5 27-3-3-3-8-3-14Z" fill="#263431" />
      <path d="M74 73c7-12 18-19 34-21 11-1 21 2 28 8-3-18-17-28-35-27-20 1-31 16-27 40Z" fill="#263431" />
      <path d="M78 91c4-3 10-3 14 0m20 0c4-3 10-3 14 0" fill="none" stroke="#49362d" strokeWidth="3" strokeLinecap="round" />
      <path d="M83 99c2 2 6 2 8 0m21 0c2 2 6 2 8 0" fill="none" stroke="#263431" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M102 98c-1 8-4 13-2 15 2 2 5 2 8 0" fill="none" stroke="#a4684c" strokeWidth="2" strokeLinecap="round" />
      <path d="M91 126c6 6 16 6 22 0" fill="none" stroke="#704337" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M72 110c2 8 4 12 8 14m51-14c-2 8-4 12-8 14" fill="none" stroke="#b87955" strokeWidth="4" strokeLinecap="round" />
      <path d="M128 161c14-6 25-16 29-30" fill="none" stroke="#c78b67" strokeWidth="10" strokeLinecap="round" />
      <path d="M155 131c3-8 9-10 15-6l3 4-5 11-10 1" fill="#c78b67" />
      <g className="tc-study-card">
        <rect x="126" y="86" width="48" height="39" rx="8" fill="#fbf2df" stroke="#dbbf85" strokeWidth="1.5" transform="rotate(7 126 86)" />
        <text x="150" y="104" textAnchor="middle" direction="rtl" fontSize="11" fontWeight="700" fill="#28453e">התקדמות</text>
        <path d="M139 111h24" stroke="#e2a34b" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {active === 'streak' && <path className="tc-orbit" d="M35 95c-9-17 0-34 14-39" fill="none" stroke="#e7bd63" strokeWidth="2.5" strokeLinecap="round" />}
      {active === 'accuracy' && <path className="tc-orbit" d="M29 87l7 7 13-15" fill="none" stroke="#e7bd63" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {active === 'milestone' && <path className="tc-orbit" d="M36 75h18m-9-9v18" fill="none" stroke="#e7bd63" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

function CelebrationMark({ mark }: { mark: Celebration['mark'] }) {
  if (mark === 'accuracy') {
    return <span className="tc-mark tc-mark--accuracy"><Check size={15} strokeWidth={3} /></span>;
  }
  if (mark === 'milestone') {
    return <span className="tc-mark tc-mark--milestone"><Sparkles size={15} /></span>;
  }
  return <span className="tc-mark tc-mark--streak"><Flame size={15} /></span>;
}

export function TutorCelebration() {
  const [activeId, setActiveId] = useState('streak');
  const [continued, setContinued] = useState(false);
  const active = celebrations.find((item) => item.id === activeId) ?? celebrations[0];

  return (
    <main className="tc-page" dir="rtl">
      <div className="tc-app">
        <header className="tc-topbar">
          <button className="tc-back" type="button" aria-label="رجوع" onClick={() => { setActiveId('streak'); setContinued(false); }}><ArrowLeft size={19} /></button>
          <div className="tc-top-title">
            <span>تدريب ياعيل</span>
            <span className="tc-top-subtitle">تدريب الكلمات</span>
          </div>
          <div className="tc-progress" aria-label="الجولة الخامسة من خمس">
            <span>٥ من ٥</span>
            <span className="tc-progress-track"><i /></span>
          </div>
        </header>

        <section className={`tc-hero tc-hero--${active.id}`} aria-live="polite">
          <div className="tc-hero-topline">
            <span className="tc-complete"><span className="tc-complete-dot" /> اكتملت الجولة</span>
            <CelebrationMark mark={active.mark} />
          </div>
          <div className="tc-hero-copy">
            <p className="tc-hero-kicker">إنجازك اليوم</p>
            <h1 key={active.id}>{active.title}</h1>
            <p className="tc-hero-detail">{active.detail}</p>
          </div>
          <div className="tc-portrait-wrap">
            <span className="tc-confetti tc-confetti-a" />
            <span className="tc-confetti tc-confetti-b" />
            <span className="tc-confetti tc-confetti-c" />
            <TutorPortrait active={active.id} />
            <span className="tc-tutor-tag"><span className="tc-online" /> رامي، معلّمك</span>
          </div>
          <div className="tc-hero-foot">
            <span className="tc-hint-icon"><BookOpen size={16} /></span>
            <span>اقرأ الإشارة في الكلمة، ثم اختر معناها.</span>
          </div>
        </section>

        <section className="tc-results" aria-label="نتيجتك">
          <div className="tc-result-score">
            <span className="tc-result-label">إجابات صحيحة</span>
            <strong>٤ <small>من ٥</small></strong>
          </div>
          <div className="tc-results-divider" />
          <div className="tc-result-score">
            <span className="tc-result-label">نقاط الخبرة</span>
            <strong className="tc-xp">+٤٠ <small>نقطة</small></strong>
          </div>
          <div className="tc-result-streak">
            <Flame size={16} />
            <span>٣ أيام</span>
          </div>
        </section>

        <section className="tc-vary" aria-label="اختر أسلوب الاحتفال">
          <div className="tc-vary-heading">
            <span>لحظتك، بطريقتك</span>
            <span>٣ احتفالات قصيرة</span>
          </div>
          <div className="tc-variants" role="tablist" aria-label="أنماط الاحتفال">
            {celebrations.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === activeId}
                className={`tc-variant ${item.id === activeId ? 'is-active' : ''}`}
                onClick={() => setActiveId(item.id)}
              >
                <CelebrationMark mark={item.mark} />
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <footer className="tc-actions">
          <button className="tc-primary" type="button" onClick={() => setContinued(true)}>
            <span>{continued ? 'أنت جاهز للجولة التالية' : 'واصل التقدّم'}</span>
            {continued ? <Check size={18} /> : <ArrowUpLeft size={18} />}
          </button>
          <button className="tc-secondary" type="button" onClick={() => setContinued(false)}>
            <RotateCw size={14} /> {continued ? 'إعادة عرض النتيجة' : 'العودة إلى التدريب'}
          </button>
        </footer>
        <p className="tc-footer-note">كل خطوة محسوبة. خذ نفسًا، أنت تتقدّم.</p>
      </div>
    </main>
  );
}
