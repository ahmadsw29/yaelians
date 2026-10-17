import './_group.css';
import { useState } from 'react';
import {
  ArrowLeft, BookOpen, Check, ChevronDown, ChevronUp, Flame, KeyRound,
  LogOut, Moon, Sun, Smartphone, Sparkles, Target, Trash2, Trophy, UserRound,
} from 'lucide-react';

const skin = ['#f5d1b2', '#e8b08a', '#c78960', '#9e6546', '#6b4230'];
const hair = ['#302720', '#654334', '#a76a3a', '#d7b16b', '#3c3c45'];
const clothes = ['#17665c', '#b56d59', '#4e6998', '#9c7aab', '#d2a348'];
const backgrounds = ['#e8eee7', '#fae4d7', '#dfe8f4', '#eee3f0', '#f5ebc9'];
type AvatarState = { skin: number; hair: number; clothes: number; background: number; hairStyle: number };

function Avatar({ config }: { config: AvatarState }) {
  const skinTone = skin[config.skin];
  const hairTone = hair[config.hair];
  const clothing = clothes[config.clothes];
  const back = backgrounds[config.background];
  return <svg role="img" aria-label="صورتك الكرتونية" viewBox="0 0 120 120" className="ya-avatar">
    <circle cx="60" cy="60" r="60" fill={back} />
    <path d={config.hairStyle === 2 ? 'M27 64 Q17 12 60 15 Q105 13 94 105 L26 105Z' : 'M28 61 Q20 15 60 17 Q102 15 94 102 L27 102Z'} fill={hairTone} />
    <path d="M17 120 Q19 87 48 85 L72 85 Q102 87 104 120Z" fill={clothing} />
    <rect x="49" y="73" width="22" height="23" rx="10" fill={skinTone} />
    <ellipse cx="60" cy="54" rx="29" ry="33" fill={skinTone} />
    <circle cx="31" cy="58" r="6" fill={skinTone} /><circle cx="89" cy="58" r="6" fill={skinTone} />
    <path d={config.hairStyle === 1 ? 'M31 47 Q21 13 57 17 Q94 13 91 46 Q78 25 68 29 Q48 49 31 47Z' : 'M31 46 Q25 17 59 17 Q92 16 91 44 Q76 42 67 30 Q50 47 31 46Z'} fill={hairTone} />
    {[33,44,56,68,80,88].map((x,i)=><circle key={x} cx={x} cy={i===0||i===5?34:25} r="10" fill={hairTone} />)}
    <path d="M41 51 Q46 48 51 51 M69 51 Q74 48 79 51" stroke={hairTone} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <circle cx="46" cy="57" r="2.4" fill="#302720"/><circle cx="74" cy="57" r="2.4" fill="#302720"/>
    <path d="M59 58 L56 67 L62 67" stroke="#9e6546" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M49 73 Q60 83 71 73" stroke="#8a493f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M40 94 L50 105 L60 97 L70 105 L80 94" stroke="#fff" strokeOpacity=".65" strokeWidth="2" fill="none" />
  </svg>;
}

function Metric({ icon: Icon, value, label, tone }: { icon: typeof Flame; value: string; label: string; tone: string }) {
  return <div className="ya-metric"><span className={`ya-metric-icon ${tone}`}><Icon size={17} strokeWidth={2.2}/></span><strong>{value}</strong><span>{label}</span></div>;
}

export function Refreshed() {
  const [avatar, setAvatar] = useState<AvatarState>({ skin: 1, hair: 0, clothes: 0, background: 0, hairStyle: 1 });
  const [theme, setTheme] = useState('فاتح');
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(false);
  const pick = (key: keyof AvatarState, index: number) => setAvatar(current => ({ ...current, [key]: index }));
  const swatches = (label: string, key: keyof AvatarState, values: string[]) => <div className="ya-option" key={key}>
    <span className="ya-option-label">{label}</span><div className="ya-swatches">
      {values.map((color, index) => <button key={color} type="button" aria-label={`${label}: ${index + 1}`} aria-pressed={avatar[key] === index} onClick={() => pick(key, index)} className={`ya-swatch ${avatar[key] === index ? 'selected' : ''}`} style={{ background: color }}>{avatar[key] === index && <Check size={15}/>}</button>)}
    </div>
  </div>;

  return <main dir="rtl" className={`ya-page ${theme === 'داكن' ? 'ya-dark' : ''}`}>
    <style>{`
      .ya-page{--bg:#f7f4ed;--fg:#17332f;--card:#fffdf8;--primary:#17665c;--pfg:#fffdf8;--secondary:#e8eee7;--muted:#74817a;--border:#e8e3d8;min-height:100vh;background:var(--bg);color:var(--fg);font-family:'DM Sans','Noto Sans Arabic',sans-serif;padding:24px 20px 38px;transition:background .2s,color .2s}
      .ya-page *{box-sizing:border-box}.ya-dark{--bg:#172622;--fg:#eff4ed;--card:#20352f;--primary:#8fc9b8;--pfg:#17332f;--secondary:#2a423a;--muted:#a9b9b0;--border:#3c5149}
      .ya-shell{max-width:520px;margin:0 auto;display:grid;gap:16px}.ya-top{display:flex;align-items:center;justify-content:space-between;padding:2px 2px 1px}.ya-heading{display:flex;align-items:center;gap:9px}.ya-heading svg{color:var(--primary)}.ya-heading h1{font-size:25px;line-height:1.2;margin:0;font-weight:800;letter-spacing:-.5px}.ya-pill{font-size:11px;font-weight:700;padding:7px 11px;border-radius:999px;background:var(--secondary);color:var(--primary)}
      .ya-profile{border-radius:25px;background:var(--secondary);padding:17px 19px;display:flex;align-items:center;gap:15px;position:relative;overflow:hidden}.ya-profile:after{content:'';position:absolute;width:112px;height:112px;border-radius:50%;background:rgba(255,255,255,.24);left:-34px;top:-43px}.ya-avatar{width:76px;height:76px;flex:0 0 76px;position:relative;z-index:1}.ya-profile-copy{min-width:0}.ya-name{font-weight:800;font-size:19px;margin:0 0 3px}.ya-email{font-size:12px;color:var(--muted);margin:0;direction:ltr;text-align:right}.ya-profile-tag{display:inline-block;margin-top:9px;padding:4px 8px;border-radius:8px;background:rgba(23,102,92,.09);font-size:10px;font-weight:700;color:var(--primary)}
      .ya-stats{background:var(--card);border:1px solid var(--border);border-radius:23px;padding:17px 16px 15px}.ya-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.ya-section-head h2{margin:0;font-size:16px;font-weight:800}.ya-section-head span{font-size:11px;color:var(--muted)}.ya-xp{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:16px;background:#17665c;color:#fffdf8;margin-bottom:10px}.ya-xp-icon{width:34px;height:34px;border-radius:12px;background:rgba(255,255,255,.15);display:grid;place-items:center;color:#f0bd72}.ya-xp-copy{flex:1}.ya-xp-copy small{display:block;color:#d4e7df;font-size:11px}.ya-xp-copy strong{font-size:22px;line-height:1.2}.ya-xp-copy strong small{display:inline;color:#d4e7df;font-size:11px}.ya-xp-next{font-size:10px;color:#d4e7df;white-space:nowrap}.ya-metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ya-metric{min-height:88px;padding:10px 8px 9px;border-radius:15px;background:var(--bg);display:flex;align-items:flex-start;flex-direction:column;justify-content:space-between}.ya-metric-icon{width:27px;height:27px;border-radius:9px;display:grid;place-items:center}.ya-metric-icon.amber{background:#fce8d7;color:#c86f48}.ya-metric-icon.green{background:#e0eee3;color:#438273}.ya-metric-icon.lilac{background:#ebe4f4;color:#8261a0}.ya-metric-icon.blue{background:#e2ebf5;color:#5d7e9b}.ya-metric strong{font-size:19px;line-height:1.1}.ya-metric span:last-child{font-size:10px;color:var(--muted);white-space:nowrap}
      .ya-plan{position:relative;overflow:hidden;background:#234f46;color:#fffdf8;padding:18px;border-radius:23px}.ya-plan:before{content:'';position:absolute;width:155px;height:155px;border:1px solid rgba(255,255,255,.13);border-radius:50%;left:-69px;top:-73px;box-shadow:0 0 0 18px rgba(255,255,255,.035),0 0 0 38px rgba(255,255,255,.025)}.ya-plan-head{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.ya-plan-title{font-size:16px;font-weight:800;margin:0}.ya-plan-desc{color:#d7e7df;font-size:11px;line-height:1.6;margin:4px 0 0}.ya-plan-price{text-align:left;white-space:nowrap}.ya-plan-price strong{font-size:22px}.ya-plan-price small{display:block;color:#d7e7df;font-size:10px}.ya-usage{display:grid;gap:9px;margin:15px 0 14px;position:relative}.ya-usage-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;font-size:11px;color:#ecf3ec}.ya-usage-label{display:flex;align-items:center;gap:7px}.ya-usage-count{color:#cfdfd6;font-size:10px}.ya-track{grid-column:1/-1;height:5px;border-radius:9px;background:rgba(255,255,255,.18);overflow:hidden}.ya-track b{display:block;height:100%;width:100%;border-radius:inherit;background:#efbd75}.ya-upgrade{position:relative;min-height:44px;border:0;border-radius:14px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;color:#17332f;background:#f0bd72;font:inherit;font-weight:800;font-size:13px;transition:transform .18s}.ya-upgrade:hover{transform:translateY(-1px)}.ya-plan-note{margin:9px 0 0;color:#d7e7df;font-size:10px;line-height:1.5;text-align:center}
      .ya-card{padding:16px;border-radius:21px;border:1px solid var(--border);background:var(--card)}.ya-card-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800;margin:0 0 13px}.ya-card-title svg{color:var(--primary)}.ya-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ya-field label{display:block;font-weight:700;font-size:11px;margin-bottom:6px}.ya-field input{width:100%;height:43px;border:1px solid var(--border);border-radius:12px;background:var(--bg);padding:0 11px;color:var(--fg);font:inherit;font-size:13px;outline:none}.ya-field input:focus{border-color:var(--primary)}.ya-save{width:100%;height:43px;border:0;border-radius:13px;background:var(--primary);color:var(--pfg);font:inherit;font-weight:800;font-size:13px;margin-top:11px;cursor:pointer}.ya-custom-toggle{border:0;background:transparent;color:var(--fg);width:100%;padding:0;display:flex;align-items:center;justify-content:space-between;font:inherit;font-size:15px;font-weight:800;cursor:pointer}.ya-custom-title{display:flex;align-items:center;gap:8px}.ya-custom-title svg{color:var(--primary)}.ya-custom-desc{font-size:11px;line-height:1.6;color:var(--muted);margin:7px 0 0;text-align:right}.ya-custom-content{padding-top:14px;display:grid;gap:14px}.ya-option{display:flex;align-items:center;justify-content:space-between;gap:10px}.ya-option-label{font-size:11px;font-weight:700}.ya-swatches{display:flex;gap:7px;flex-wrap:wrap}.ya-swatch{height:31px;width:31px;border-radius:50%;border:1px solid var(--border);display:grid;place-items:center;color:#17665c;cursor:pointer}.ya-swatch.selected{border:2px solid var(--primary);box-shadow:0 0 0 2px var(--card) inset}.ya-hair-options{display:flex;gap:7px}.ya-hair-options button{border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--fg);font:inherit;font-size:11px;padding:7px 11px;cursor:pointer}.ya-hair-options button.selected{background:var(--secondary);border-color:var(--primary);color:var(--primary);font-weight:700}
      .ya-theme{display:flex;gap:8px}.ya-theme button{flex:1;min-height:48px;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border);background:var(--bg);border-radius:12px;color:var(--muted);font:inherit;font-size:11px;cursor:pointer}.ya-theme button.selected{background:var(--secondary);border-color:var(--primary);color:var(--primary);font-weight:700}.ya-caption{font-size:10px;color:var(--muted);margin:8px 0 0;text-align:right}.ya-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ya-action{min-height:45px;border:1px solid var(--border);background:var(--card);border-radius:13px;color:var(--fg);font:inherit;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}.ya-action.delete{color:#b94d43;border-color:#e9c9c3;background:#fff9f7}.ya-feedback{padding:9px 12px;border-radius:12px;background:var(--secondary);color:var(--primary);font-size:12px;text-align:right}.ya-delete-confirm{display:grid;gap:9px}.ya-delete-confirm p{font-size:11px;color:var(--muted);line-height:1.6;margin:0}.ya-delete-confirm button{border:1px solid #e9c9c3;border-radius:11px;background:#fff9f7;color:#b94d43;font:inherit;font-weight:700;padding:10px;cursor:pointer}
      @media(max-width:370px){.ya-page{padding-inline:14px}.ya-metric-grid{gap:5px}.ya-metric{padding-inline:6px}.ya-metric span:last-child{font-size:9px}.ya-xp-next{display:none}.ya-profile{padding:14px}.ya-option{align-items:flex-start;flex-direction:column}.ya-swatches{width:100%;justify-content:flex-start}}
      @media(min-width:700px){.ya-page{padding-top:34px}.ya-shell{gap:18px}}
    `}</style>
    <div className="ya-shell">
      <header className="ya-top"><div className="ya-heading"><UserRound size={21}/><h1>حسابي</h1></div><span className="ya-pill">مساحتك للتعلّم</span></header>
      <section className="ya-profile">
        <Avatar config={avatar}/><div className="ya-profile-copy"><h2 className="ya-name">سامي أحمد</h2><p className="ya-email">sami@example.com</p><span className="ya-profile-tag">تعلّم العبرية خطوة بخطوة</span></div>
      </section>
      <section className="ya-stats" aria-label="إحصاءات التعلّم">
        <div className="ya-section-head"><h2>تقدّمك حتى الآن</h2><span>كل خطوة محسوبة</span></div>
        <div className="ya-xp"><span className="ya-xp-icon"><Sparkles size={18}/></span><div className="ya-xp-copy"><small>رصيد الخبرة</small><strong>420 <small>نقطة XP</small></strong></div><span className="ya-xp-next">باقي 80 للمستوى التالي</span></div>
        <div className="ya-metric-grid">
          <Metric icon={Flame} value="6" label="أيام متتالية" tone="amber"/><Metric icon={BookOpen} value="84" label="كلمة أتقنتها" tone="lilac"/><Metric icon={Trophy} value="12" label="درسًا مكتملًا" tone="blue"/><Metric icon={Target} value="78%" label="دقّة الإجابات" tone="green"/>
        </div>
      </section>
      <section className="ya-plan">
        <div className="ya-plan-head"><div><h2 className="ya-plan-title">أنت على الخطة المجانية</h2><p className="ya-plan-desc">واصل التقدّم، وافتح كل أدوات الدراسة وقتما تكون جاهزًا.</p></div><div className="ya-plan-price"><strong>₪48.90</strong><small>شهريًا</small></div></div>
        <div className="ya-usage">
          <div className="ya-usage-row"><span className="ya-usage-label"><BookOpen size={14}/> جولة مفردات اليوم</span><span className="ya-usage-count">1 من 1 مستخدمة</span><div className="ya-track"><b/></div></div>
          <div className="ya-usage-row"><span className="ya-usage-label"><Target size={14}/> جلسة امتحان اليوم</span><span className="ya-usage-count">0 من 1 مستخدمة</span><div className="ya-track"><b style={{width:'0%',background:'#efbd75'}}/></div></div>
        </div>
        <a className="ya-upgrade" href="/plans">اكتشف الخطة الكاملة <ArrowLeft size={16}/></a>
        <p className="ya-plan-note">₪48.90 شهريًا · الدفع غير متاح حاليًا، لكن يمكنك الاطلاع على تفاصيل الخطة.</p>
      </section>
      <section className="ya-card">
        <h2 className="ya-card-title"><UserRound size={17}/> بياناتك</h2>
        <div className="ya-fields"><div className="ya-field"><label htmlFor="ya-first">الاسم الأول</label><input id="ya-first" defaultValue="سامي" dir="rtl"/></div><div className="ya-field"><label htmlFor="ya-last">اسم العائلة</label><input id="ya-last" defaultValue="أحمد" dir="rtl"/></div></div>
        <button className="ya-save" type="button" onClick={() => setNotice('تم حفظ بياناتك وشخصيتك بنجاح.')}>حفظ التغييرات</button>
      </section>
      <section className="ya-card">
        <button className="ya-custom-toggle" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><span className="ya-custom-title"><Sparkles size={17}/> شخصيتك الكرتونية</span>{expanded?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</button>
        <p className="ya-custom-desc">اختَر التفاصيل التي تعبّر عنك.</p>
        {expanded && <div className="ya-custom-content">
          {swatches('لون البشرة','skin',skin)}{swatches('لون الشعر','hair',hair)}{swatches('لون الملابس','clothes',clothes)}{swatches('الخلفية','background',backgrounds)}
          <div className="ya-option"><span className="ya-option-label">تسريحة الشعر</span><div className="ya-hair-options">{['قصير','مجعد','طويل'].map((label,index)=><button key={label} type="button" className={avatar.hairStyle===index?'selected':''} aria-pressed={avatar.hairStyle===index} onClick={()=>pick('hairStyle',index)}>{label}</button>)}</div></div>
        </div>}
      </section>
      <section className="ya-card">
        <h2 className="ya-card-title"><Sun size={17}/> مظهر التطبيق</h2><div className="ya-theme">
          {[['فاتح',Sun],['داكن',Moon],['تلقائي',Smartphone]].map(([label,Icon])=>{const ThemeIcon=Icon as typeof Sun; return <button key={label as string} type="button" className={theme===label?'selected':''} aria-pressed={theme===label} onClick={()=>setTheme(label as string)}><ThemeIcon size={16}/>{label as string}</button>})}
        </div><p className="ya-caption">يُحفظ اختيارك على هذا الجهاز.</p>
      </section>
      {notice && <div className="ya-feedback" role="status">{notice}</div>}
      <div className="ya-actions"><button className="ya-action" type="button" onClick={()=>setNotice('تم تسجيل خروجك من الحساب.') }><LogOut size={16}/> تسجيل الخروج</button><button className="ya-action delete" type="button" onClick={()=>{setDeleting(!deleting);setNotice('')}}><Trash2 size={16}/> حذف الحساب</button></div>
      {deleting && <section className="ya-card ya-delete-confirm"><h2 className="ya-card-title" style={{color:'#b94d43',marginBottom:0}}><KeyRound size={17}/> تأكيد حذف الحساب</h2><p>سيُحذف حسابك وبيانات التعلّم نهائيًا. سيُطلب منك التحقق من هويتك قبل إتمام الحذف.</p><button type="button" onClick={()=>{setDeleting(false);setNotice('تم إلغاء طلب الحذف.')}}>متابعة إلى التحقق</button></section>}
    </div>
  </main>;
}
