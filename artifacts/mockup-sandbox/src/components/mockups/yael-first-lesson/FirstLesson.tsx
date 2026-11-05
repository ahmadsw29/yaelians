import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, LockKeyhole, Sparkles } from 'lucide-react';
import './FirstLesson.css';

const questions = [
  { word: 'למרות זאת', prompt: 'أيّ معنى يناسب هذا التعبير؟', answers: ['لذلك', 'رغم ذلك', 'بالإضافة إلى', 'قبل ذلك'], correct: 1, note: 'نستخدمه عندما تأتي النتيجة عكس التوقّع.', example: 'ירד גשם. למרות זאת, יצאנו לטייל.', translation: 'هطل المطر. رغم ذلك، خرجنا للتنزّه.' },
  { word: 'בנוסף', prompt: 'والآن، ما معنى هذه الكلمة؟', answers: ['بدلًا من', 'أحيانًا', 'بالإضافة إلى', 'مع ذلك'], correct: 2, note: 'تضيف معلومة جديدة إلى الفكرة السابقة.', example: 'אני לומד עברית. בנוסף, אני קורא ספרים.', translation: 'أتعلّم العبرية. بالإضافة إلى ذلك، أقرأ الكتب.' },
  { word: 'לכן', prompt: 'كلمة أخيرة. ما المعنى الصحيح؟', answers: ['لذلك', 'بالرغم من', 'قبل أن', 'أيضًا'], correct: 0, note: 'تربط السبب بالنتيجة، وهي شائعة في نصوص الامتحان.', example: 'הייתי עייף, לכן הלכתי לישון.', translation: 'كنت متعبًا، لذلك ذهبت للنوم.' },
];
const tracks = [
  { name: 'المفردات', title: 'كلمات تربط الأفكار', description: 'ابدأ بثلاث كلمات من لغة الامتحان.', sample: 'למרות זאת · בנוסף · לכן' },
  { name: 'فهم المقروء', title: 'المعنى بين السطور', description: 'اقرأ جملة قصيرة، ثم اكتشف الفكرة.', sample: 'הספר היה מעניין, לכן קראתי אותו שוב.' },
  { name: 'إعادة الصياغة', title: 'فكرة واحدة، بطريقتين', description: 'تعلّم كيف يبقى المعنى وتتغيّر الكلمات.', sample: 'הוא הגיע למרות הגשם.' },
];

export default function FirstLesson() {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [track, setTrack] = useState(0);
  const [screen, setScreen] = useState<'home' | 'complete' | 'track' | 'signin'>('home');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const q = questions[step];

  function advance() {
    if (!checked) {
      if (answer === null) return;
      setChecked(true);
      if (answer === q.correct) setCorrect(value => value + 1);
      return;
    }
    if (step === questions.length - 1) { setScreen('complete'); return; }
    setStep(value => value + 1);
    setAnswer(null);
    setChecked(false);
  }
  function restart() {
    setStep(0); setAnswer(null); setChecked(false); setCorrect(0); setScreen('home');
  }
  return (
    <main className="first-lesson" dir="rtl" lang="ar">
      <header className="fl-header">
        <div className="fl-logo"><BookOpen strokeWidth={1.6} /><span>كَلِمَة</span></div>
        <button className="fl-signin" onClick={() => { setScreen('signin'); setSent(false); }}>لديك حساب؟</button>
      </header>
      {screen === 'home' ? <>
        <section className="fl-intro">
          <div className="fl-eyebrow"><span />YOUR FIRST STEP TO YAEL</div>
          <h1>لا تحفظ الكلمة.<br /><em>افهم ما وراءها.</em></h1>
          <p>ابدأ بتجربة صغيرة. ثلاث كلمات، ومعنى يبقى معك.</p>
        </section>
        <section className="fl-demo" aria-label="درس تجريبي">
          <div className="fl-demobar"><span className="fl-demo-label"><Sparkles /> جرّب بنفسك</span><span className="fl-number" dir="ltr">0{step + 1} / 03</span></div>
          <div className="fl-question"><div className="fl-hebrew" lang="he" dir="rtl">{q.word}</div><p>{q.prompt}</p></div>
          <div className="fl-options">{q.answers.map((label, i) => <button key={label} aria-pressed={answer === i} className={`fl-option ${answer === i ? 'selected' : ''} ${checked && i === q.correct ? 'correct' : ''} ${checked && answer === i && i !== q.correct ? 'wrong' : ''}`} onClick={() => { if (!checked) setAnswer(i); }}><b style={{ fontWeight: 500 }}>{label}</b><span>{checked && i === q.correct ? <Check size={12} /> : i + 1}</span></button>)}</div>
          {checked && <div className="fl-feedback" role="status"><b>{answer === q.correct ? 'صحيح، التقطت المعنى!' : 'قريب! المعنى الصحيح هو: ' + q.answers[q.correct]}</b>{q.note}<div lang="he" style={{ marginTop: 5 }}>{q.example}</div><div style={{ fontSize: 10, color: '#687254' }}>{q.translation}</div></div>}
          <button className="fl-primary" disabled={answer === null} onClick={advance}>{checked ? step === 2 ? 'شاهد حصيلة تجربتك' : 'الكلمة التالية' : 'تحقّق من إجابتك'}<ArrowLeft /></button>
          <div className="fl-dots" aria-label={`السؤال ${step + 1} من 3`}>{questions.map((_, i) => <span key={i} className={i === step ? 'active' : ''} />)}</div>
        </section>
        <p className="fl-footnote"><LockKeyhole /> تجربة مجانية · بلا حساب أو بطاقة دفع</p>
        <section className="fl-browse">
          <div className="fl-section-title"><h2>لكل مهارة، طريق.</h2><span>اكتشف ما ستتعلّمه</span></div>
          <div className="fl-tracks" role="tablist" aria-label="مهارات الامتحان">{tracks.map((item, i) => <button key={item.name} role="tab" aria-selected={track === i} onClick={() => setTrack(i)} className={track === i ? 'active' : ''}>{item.name}</button>)}</div>
          <div className="fl-track-info" role="tabpanel"><div><b>{tracks[track].title}</b><p>{tracks[track].description}</p></div><button className="fl-track-arrow" aria-label={`استكشف ${tracks[track].name}`} onClick={() => setScreen('track')}><ArrowLeft /></button></div>
        </section>
        <footer className="fl-footer"><span>العبرية بالعربية. على مهلك.</span><span>YAEL, ONE WORD AT A TIME.</span></footer>
      </> : <section className="fl-detail">
        <button className="fl-back" onClick={() => setScreen('home')}><ArrowRight size={17} /> العودة للتجربة</button>
        {screen === 'complete' ? <>
          <div className="fl-success-mark"><CheckCheck size={30} /></div>
          <h2>ثلاث كلمات.<br />وخطوة حقيقية للأمام.</h2>
          <p>أجبت بشكل صحيح عن {correct} من 3 أسئلة. تعرّفت الآن على كلمات تساعدك على فهم العلاقة بين الأفكار في نصوص YAEL.</p>
          <div className="fl-hebrew" lang="he" style={{ fontSize: 25 }}>למרות זאת · בנוסף · לכן</div>
          <button className="fl-primary" onClick={() => { setScreen('signin'); setSent(false); }}>احفظ خطوتك الأولى <ArrowLeft /></button>
          <button className="fl-back" onClick={restart}>جرّب الجولة من جديد</button>
          <small>هذه تجربة تصميمية. نتائج هذه الجولة غير محفوظة في حساب.</small>
        </> : screen === 'track' ? <>
          <div className="fl-eyebrow" style={{ marginTop: 35 }}>EXPLORE / 0{track + 1}</div>
          <h2>{tracks[track].title}</h2><p>{tracks[track].description} شرح بالعربية، وأمثلة بالعبرية تساعدك على بناء الفهم خطوة بخطوة.</p>
          <div className="fl-hebrew" lang="he" style={{ fontSize: 25 }}>{tracks[track].sample}</div>
          <p>{track === 1 ? 'كان الكتاب ممتعًا، لذلك قرأته مرة أخرى. لاحظ كيف تربط «לכן» السبب بالنتيجة.' : track === 2 ? 'وصل رغم المطر. يمكن تغيير ترتيب الكلمات دون تغيير الفكرة الأساسية.' : 'رغم ذلك، بالإضافة إلى، لذلك. كلمات صغيرة تغيّر طريقة فهمك للنص.'}</p>
          <button className="fl-primary" onClick={restart}>ابدأ تجربة المفردات <ArrowLeft /></button>
        </> : <>
          <div className="fl-eyebrow" style={{ marginTop: 35 }}>YOUR LEARNING, CONTINUED</div>
          <h2>{sent ? 'خطوتك التالية واضحة.' : 'كل كلمة تستحقّ أن تبقى.'}</h2>
          {sent ? <div role="status"><p>هذه معاينة تفاعلية فقط؛ لم تُرسل رسالة ولم يُنشأ حساب. في التطبيق، يمكنك تسجيل الدخول لحفظ تقدّمك ومتابعة التعلّم.</p><button className="fl-primary" onClick={() => setScreen('home')}>العودة إلى تجربتك <ArrowLeft /></button></div> : <>
            <p>سجّل دخولك لتجمع كلماتك وتتابع من حيث توقّفت.</p>
            <form onSubmit={event => { event.preventDefault(); setSent(true); }}><label htmlFor="first-lesson-email">البريد الإلكتروني</label><input id="first-lesson-email" type="email" dir="ltr" autoComplete="email" placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} /><button className="fl-primary" type="submit">متابعة <ArrowLeft /></button></form>
            <small>معاينة تصميمية — تسجيل الدخول غير متصل في هذه التجربة.<br />لا اشتراك أو دفع في هذه الخطوة.</small>
          </>}
        </>}
      </section>}
    </main>
  );
}
