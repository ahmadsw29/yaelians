import './_group.css';
import {
  Check, ChevronDown, LogOut, Moon, Smartphone, Sun, Trash2, UserRound,
} from 'lucide-react';

const skin = ['#f5d1b2', '#e8b08a', '#c78960', '#9e6546', '#6b4230'];
const hair = ['#302720', '#654334', '#a76a3a', '#d7b16b', '#3c3c45'];
const clothes = ['#17665c', '#b56d59', '#4e6998', '#9c7aab', '#d2a348'];
const backgrounds = ['#e8eee7', '#fae4d7', '#dfe8f4', '#eee3f0', '#f5ebc9'];

function Avatar() {
  return (
    <svg aria-label="الصورة الكرتونية الشخصية" role="img" width="126" height="126" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="60" fill={backgrounds[0]} />
      <path d="M28 61 Q20 15 60 17 Q102 15 94 102 L27 102Z" fill={hair[0]} />
      <path d="M17 120 Q19 87 48 85 L72 85 Q102 87 104 120Z" fill={clothes[0]} />
      <rect x="49" y="73" width="22" height="23" rx="10" fill={skin[1]} />
      <ellipse cx="60" cy="54" rx="29" ry="33" fill={skin[1]} />
      <circle cx="31" cy="58" r="6" fill={skin[1]} />
      <circle cx="89" cy="58" r="6" fill={skin[1]} />
      <path d="M31 46 Q25 17 59 17 Q92 16 91 44 Q76 42 67 30 Q50 47 31 46Z" fill={hair[0]} />
      {[33, 44, 56, 68, 80, 88].map((x, i) => <circle key={x} cx={x} cy={i === 0 || i === 5 ? 34 : 25} r="10" fill={hair[0]} />)}
      <path d="M41 51 Q46 48 51 51 M69 51 Q74 48 79 51" stroke={hair[0]} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="46" cy="57" r="2.4" fill="#302720" />
      <circle cx="74" cy="57" r="2.4" fill="#302720" />
      <path d="M59 58 L56 67 L62 67" stroke="#9e6546" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M49 73 Q60 83 71 73" stroke="#8a493f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M40 94 L50 105 L60 97 L70 105 L80 94" stroke="#ffffff" strokeOpacity=".65" strokeWidth="2" fill="none" />
    </svg>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label style={{ display: 'grid', gap: 8, color: 'var(--yael-fg)', fontSize: 14, fontWeight: 600 }}>
      {label}
      <span style={{ display: 'block', minHeight: 54, border: '1px solid var(--yael-border)', borderRadius: 16, background: 'var(--yael-card)', padding: '17px 16px', textAlign: 'right', fontWeight: 400 }}>
        {value}
      </span>
    </label>
  );
}

function Button({ children, secondary = false }: { children: React.ReactNode; secondary?: boolean }) {
  return (
    <button type="button" style={{ border: 0, minHeight: 52, padding: 14, borderRadius: 16, background: secondary ? 'var(--yael-secondary)' : 'var(--yael-primary)', color: secondary ? 'var(--yael-secondary-fg)' : 'var(--yael-primary-fg)', font: 'inherit', fontWeight: 700 }}>
      {children}
    </button>
  );
}

export function Current() {
  const card: React.CSSProperties = { padding: 20, borderRadius: 22, border: '1px solid var(--yael-border)', background: 'var(--yael-card)', display: 'grid', gap: 16 };
  const sectionTitle: React.CSSProperties = { color: 'var(--yael-fg)', fontSize: 19, fontWeight: 700, textAlign: 'right', margin: 0 };
  const caption: React.CSSProperties = { color: 'var(--yael-muted)', fontSize: 13, lineHeight: 1.7, textAlign: 'right', margin: 0 };
  const swatches = (values: string[]) => (
    <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 12, flexWrap: 'wrap' }}>
      {values.map((value, index) => (
        <button key={value} aria-label={`الخيار ${index + 1}`} type="button" style={{ width: 44, height: 44, borderRadius: 22, background: value, border: index === 0 ? '3px solid var(--yael-primary)' : '1px solid var(--yael-border)' }}>
          {index === 0 && <Check size={15} color="var(--yael-primary)" />}
        </button>
      ))}
    </div>
  );

  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: 'var(--yael-bg)', color: 'var(--yael-fg)', padding: '24px 22px 100px', maxWidth: 600, margin: '0 auto', display: 'grid', alignContent: 'start', gap: 20 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserRound size={22} color="var(--yael-primary)" />
        <h1 style={{ fontSize: 28, margin: 0 }}>حسابي</h1>
      </header>
      <section style={{ ...card, border: 0, borderRadius: 26, background: 'var(--yael-secondary)', justifyItems: 'center', padding: 26, gap: 14 }}>
        <Avatar />
        <h2 style={{ fontSize: 22, margin: 0 }}>سامي أحمد</h2>
        <p style={{ ...caption, textAlign: 'center' }}>sami@example.com</p>
      </section>
      <section style={card}>
        <h2 style={sectionTitle}>بياناتي</h2>
        <Field label="الاسم الأول" value="سامي" />
        <Field label="اسم العائلة (اختياري)" value="أحمد" />
      </section>
      <section style={card}>
        <h2 style={sectionTitle}>شخصيتك، بطريقتك</h2>
        <p style={caption}>اختر تفاصيل شخصيتك الكرتونية الخاصة بالتطبيق.</p>
        {[
          ['لون البشرة', skin],
          ['لون الشعر', hair],
          ['لون الملابس', clothes],
          ['الخلفية', backgrounds],
        ].map(([label, values]) => (
          <div key={label as string} style={{ display: 'grid', gap: 10 }}>
            <strong style={{ fontSize: 14 }}>{label as string}</strong>
            {swatches(values as string[])}
          </div>
        ))}
        <div style={{ display: 'grid', gap: 10 }}>
          <strong style={{ fontSize: 14 }}>تسريحة الشعر</strong>
          <div style={{ display: 'flex', gap: 10 }}>
            {['قصير', 'مجعد', 'طويل'].map((style, index) => <button key={style} type="button" style={{ borderRadius: 14, border: index === 1 ? '2px solid var(--yael-primary)' : '1px solid var(--yael-border)', background: index === 1 ? 'var(--yael-secondary)' : 'var(--yael-bg)', color: 'var(--yael-fg)', padding: '10px 14px' }}>{style}</button>)}
          </div>
        </div>
      </section>
      <section style={card}>
        <h2 style={sectionTitle}>خطتك</h2>
        <p style={caption}>مجانية · المفردات اليوم: 0/1 · جلسات الوقت اليوم: 0/1</p>
        <Button secondary>عرض الخطط</Button>
      </section>
      <Button>حفظ التغييرات</Button>
      <section style={card}>
        <h2 style={sectionTitle}>مظهر التطبيق</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['فاتح', Sun], ['داكن', Moon], ['تلقائي', Smartphone]].map(([title, Icon]) => (
            <button key={title as string} type="button" style={{ flex: 1, minHeight: 64, border: '1px solid var(--yael-border)', borderRadius: 16, background: 'var(--yael-secondary)', color: 'var(--yael-fg)', display: 'grid', placeItems: 'center', gap: 5 }}>
              <Icon size={20} /><span>{title as string}</span>
            </button>
          ))}
        </div>
        <p style={caption}>يُحفظ اختيارك على هذا الجهاز.</p>
      </section>
      <Button secondary><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><LogOut size={17} />تسجيل الخروج</span></Button>
      <section style={{ ...card, borderColor: 'var(--yael-danger)' }}>
        <h2 style={{ ...sectionTitle, color: 'var(--yael-danger)' }}>حذف الحساب</h2>
        <p style={caption}>حذف دائم للحساب وبيانات التعلّم. ستُطلب موافقتك والتحقق من هويتك أولًا.</p>
        <Button secondary><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Trash2 size={17} />حذف حسابي…</span></Button>
      </section>
      <div style={{ textAlign: 'center', color: 'var(--yael-muted)', fontSize: 12, display: 'flex', justifyContent: 'center', gap: 6 }}>
        النسخة الحالية من الحساب <ChevronDown size={14} />
      </div>
    </main>
  );
}
