import { QUESTIONS, YAEL_VOCABULARY_QUESTIONS, type Question } from './study';
import { ACADEMIC_ROWS } from './vocabulary/academic';
import { EVERYDAY_ROWS } from './vocabulary/everyday';
import { SOCIETY_ROWS } from './vocabulary/society';
import { VERB_ROWS } from './vocabulary/verbs';
import { WORLD_ROWS } from './vocabulary/world';

// Additional academic Hebrew practice, with authored Arabic meanings and examples.
const entries = [
  ['הישג', 'heseg', 'إنجاز', 'ההישג הוא תוצאה של עבודה קשה.'],
  ['מאמץ', 'maamats', 'جهد', 'הלימודים דורשים מאמץ והתמדה.'],
  ['התמדה', 'hatmada', 'مواظبة', 'ההתמדה עזרה לו להצליח בבחינה.'],
  ['מטרה', 'matara', 'هدف', 'המטרה שלנו היא לשפר את הקריאה.'],
  ['אמצעי', 'emtsai', 'وسيلة', 'הטלפון הוא אמצעי תקשורת חשוב.'],
  ['יתרון', 'yitron', 'ميزة', 'ללימוד בקבוצה יש יתרון חשוב.'],
  ['חיסרון', 'chisaron', 'عيب / نقطة ضعف', 'המחיר הגבוה הוא חיסרון של המוצר.'],
  ['פתרון', 'pitron', 'حلّ', 'החוקר הציע פתרון לבעיה.'],
  ['גורם', 'gorem', 'عامل / سبب', 'המחיר הוא גורם חשוב בהחלטה.'],
  ['תהליך', 'tahalich', 'عملية / سيرورة', 'תהליך הלמידה נמשך כל החיים.'],
  ['תופעה', 'tofaa', 'ظاهرة', 'החוקרים בדקו את התופעה החדשה.'],
  ['מסקנה', 'maskana', 'استنتاج', 'מן הנתונים אפשר להגיע למסקנה ברורה.'],
  ['הוכחה', 'hochacha', 'دليل / إثبات', 'אין הוכחה לטענה הזאת.'],
  ['טענה', 'taana', 'ادّعاء', 'המאמר מציג טענה חדשה.'],
  ['השערה', 'hashara', 'فرضية', 'הניסוי נועד לבדוק את ההשערה.'],
  ['ניסוי', 'nisui', 'تجربة علمية', 'הניסוי נערך במעבדה.'],
  ['מחקר', 'mechkar', 'بحث علمي', 'המחקר עסק בהרגלי הקריאה.'],
  ['נתונים', 'netunim', 'معطيات / بيانات', 'הנתונים נאספו במשך שנה.'],
  ['מידע', 'meida', 'معلومات', 'הספר מספק מידע על ההיסטוריה.'],
  ['מקור', 'makor', 'مصدر', 'יש לבדוק את מקור המידע.'],
  ['השוואה', 'hashvaa', 'مقارنة', 'ההשוואה בין הקבוצות חשובה למחקר.'],
  ['הבדל', 'hevdel', 'فرق / اختلاف', 'יש הבדל בין שתי השיטות.'],
  ['דמיון', 'dimyon', 'تشابه', 'הדמיון בין התוצאות מפתיע.'],
  ['תנאי', 'tnai', 'شرط', 'הצלחה בקורס היא תנאי לקבלה לתוכנית.'],
  ['אפשרות', 'efsharut', 'إمكانية', 'יש אפשרות ללמוד גם בערב.'],
  ['הזדמנות', 'hizdamnut', 'فرصة', 'הנסיעה היא הזדמנות ללמוד שפה.'],
  ['החלטה', 'hachlata', 'قرار', 'ההחלטה התקבלה לאחר דיון ארוך.'],
  ['אחריות', 'achrayut', 'مسؤولية', 'לכל אדם יש אחריות לשמור על הסביבה.'],
  ['דרישה', 'drisha', 'متطلّب / مطالبة', 'הדרישה לעובדים מקצועיים גדלה.'],
  ['הצעה', 'hatsaa', 'اقتراح', 'הוועדה דנה בהצעה החדשה.'],
  ['שיפור', 'shipur', 'تحسين / تحسّن', 'חל שיפור ברמת השירות.'],
  ['התפתחות', 'hitpatchut', 'تطوّر', 'ההתפתחות הטכנולוגית שינתה את חיינו.'],
  ['שינוי', 'shinui', 'تغيير', 'השינוי בתוכנית הפתיע את התלמידים.'],
  ['עלייה', 'aliya', 'ارتفاع / زيادة', 'נרשמה עלייה במספר הסטודנטים.'],
  ['ירידה', 'yerida', 'انخفاض', 'השנה חלה ירידה במחירים.'],
  ['כמות', 'kamut', 'كمية', 'כמות המים במאגר קטנה.'],
  ['איכות', 'eichut', 'جودة', 'איכות המוצר חשובה לצרכנים.'],
  ['תועלת', 'toelet', 'فائدة', 'לפעילות גופנית יש תועלת רבה.'],
  ['נזק', 'nezek', 'ضرر', 'הסערה גרמה נזק לבתים.'],
  ['סיכון', 'sikun', 'خطر / مخاطرة', 'יש סיכון בנהיגה במהירות גבוהה.'],
  ['זמינות', 'zminut', 'توفّر / إتاحة', 'זמינות התחבורה משפיעה על העובדים.'],
  ['משאב', 'mashav', 'مورد', 'מים הם משאב חיוני לחיים.'],
  ['צורך', 'tsorech', 'حاجة', 'יש צורך לשפר את התחבורה הציבורית.'],
  ['תמיכה', 'tmicha', 'دعم', 'התלמיד קיבל תמיכה ממשפחתו.'],
  ['מגבלה', 'migbala', 'قيد / محدودية', 'הזמן הוא מגבלה חשובה בניסוי.'],
  ['מיומנות', 'meyumanut', 'مهارة', 'קריאה היא מיומנות שאפשר לפתח.'],
] as const;

const extra: Question[] = entries.map(([word, transliteration, meaning, sentence], index) => {
  const options = [meaning, entries[(index + 7) % entries.length][2], entries[(index + 17) % entries.length][2], entries[(index + 29) % entries.length][2]];
  const offset = index % 4;
  return { word, transliteration, meaning, sentence, prompt: 'اختر المعنى الصحيح:',
    options: [...options.slice(offset), ...options.slice(0, offset)], correctAnswer: meaning };
});

const expandedRows = [
  ...VERB_ROWS.trim().split('\n').slice(0, 190),
  ...ACADEMIC_ROWS.trim().split('\n').slice(0, 190),
  ...SOCIETY_ROWS.trim().split('\n').slice(0, 190),
  ...WORLD_ROWS.trim().split('\n').slice(0, 190),
  ...EVERYDAY_ROWS.trim().split('\n').slice(0, 190),
].map((row) => {
  const [word, meaning, sentence] = row.split('|');
  if (!word?.trim() || !meaning?.trim() || !sentence?.trim()) {
    throw new Error(`Invalid vocabulary row: ${row}`);
  }
  return { word: word.trim(), meaning: meaning.trim(), sentence: sentence.trim() };
});

// Keep every distractor distinct from the answer and from each other.
// The bank rotates its distractor starting point per word to avoid a fixed pattern.
const expanded: Question[] = expandedRows.map((entry, index) => {
  const choices = [entry.meaning];
  for (let offset = 13; choices.length < 4 && offset < expandedRows.length; offset += 1) {
    const candidate = expandedRows[(index + offset) % expandedRows.length].meaning;
    if (!choices.includes(candidate)) choices.push(candidate);
  }
  if (choices.length !== 4) throw new Error(`Not enough unique choices for ${entry.word}`);
  const shift = index % 4;
  const options = [...choices.slice(shift), ...choices.slice(0, shift)];
  return {
    word: entry.word,
    transliteration: '',
    meaning: entry.meaning,
    prompt: 'ما معنى الكلمة في هذا المثال؟',
    options,
    correctAnswer: entry.meaning,
    sentence: entry.sentence,
  };
});

export const VOCABULARY_BANK = [...new Map(
  [...QUESTIONS, ...YAEL_VOCABULARY_QUESTIONS, ...extra, ...expanded].map(question => [question.word, question]),
).values()];
