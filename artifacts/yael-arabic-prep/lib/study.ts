import AsyncStorage from '@react-native-async-storage/async-storage';

export type StudyStats = {
  xp: number;
  streak: number;
  correctAnswers: number;
  answeredQuestions: number;
  lessonsCompleted: number;
  masteredWords: number;
  lastPracticeDate: string | null;
};

export const DEFAULT_STATS: StudyStats = {
  xp: 0,
  streak: 0,
  correctAnswers: 0,
  answeredQuestions: 0,
  lessonsCompleted: 0,
  masteredWords: 0,
  lastPracticeDate: null,
};

const STATS_KEY = 'yael-study-stats-v1';

export async function readStudyStats(): Promise<StudyStats> {
  try {
    const stored = await AsyncStorage.getItem(STATS_KEY);
    if (!stored) return DEFAULT_STATS;
    const parsed = JSON.parse(stored) as Partial<StudyStats>;
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return DEFAULT_STATS;
  }
}

export async function recordLesson(correct: number, total: number) {
  const previous = await readStudyStats();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const alreadyPracticedToday = previous.lastPracticeDate === today;
  const streak = alreadyPracticedToday
    ? previous.streak
    : previous.lastPracticeDate === yesterday
      ? previous.streak + 1
      : 1;

  const next: StudyStats = {
    xp: previous.xp + correct * 10,
    streak,
    correctAnswers: previous.correctAnswers + correct,
    answeredQuestions: previous.answeredQuestions + total,
    lessonsCompleted: previous.lessonsCompleted + 1,
    masteredWords: previous.masteredWords + correct,
    lastPracticeDate: today,
  };
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
  return next;
}

export type Question = {
  word: string;
  transliteration: string;
  meaning: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  sentence: string;
};

export const QUESTIONS: Question[] = [
  {
    word: 'להצליח',
    transliteration: 'lehatzliach',
    meaning: 'أن ينجح',
    prompt: 'ماذا تعني الكلمة العبرية؟',
    options: ['أن ينجح', 'أن يتأخر', 'أن يختار', 'أن يسأل'],
    correctAnswer: 'أن ينجح',
    sentence: 'אני רוצה להצליח במבחן.',
  },
  {
    word: 'למרות',
    transliteration: 'lamrot',
    meaning: 'على الرغم من',
    prompt: 'اختر المعنى الصحيح:',
    options: ['بجانب', 'على الرغم من', 'قبل', 'بسبب'],
    correctAnswer: 'على الرغم من',
    sentence: 'למרות הקושי, היא המשיכה ללמוד.',
  },
  {
    word: 'סביבה',
    transliteration: 'sviva',
    meaning: 'بيئة / محيط',
    prompt: 'ما معنى الكلمة؟',
    options: ['مكتبة', 'بيئة / محيط', 'عطلة', 'خبرة'],
    correctAnswer: 'بيئة / محيط',
    sentence: 'חשוב לשמור על הסביבה.',
  },
  {
    word: 'להשפיע',
    transliteration: 'lehashpia',
    meaning: 'أن يؤثّر',
    prompt: 'ما المعنى الأقرب؟',
    options: ['أن يؤثّر', 'أن يفسّر', 'أن يتذكّر', 'أن يترجم'],
    correctAnswer: 'أن يؤثّر',
    sentence: 'למילים יש כוח להשפיע.',
  },
  {
    word: 'פתרון',
    transliteration: 'pitron',
    meaning: 'حلّ',
    prompt: 'اختر الترجمة الصحيحة:',
    options: ['سؤال', 'حلّ', 'نتيجة', 'مشكلة'],
    correctAnswer: 'حلّ',
    sentence: 'מצאנו פתרון לבעיה.',
  },
];

// Useful vocabulary collected from the learner's uploaded YAEL booklets.
export const YAEL_VOCABULARY_QUESTIONS: Question[] = [
  { word: 'להודות', transliteration: 'lehodot', meaning: 'أن يعترف', prompt: 'ماذا تعني الكلمة؟', options: ['أن يعتذر', 'أن يعترف', 'أن يتأخر', 'أن يشرح'], correctAnswer: 'أن يعترف', sentence: 'הוא לא העז להודות בטעות.' },
  { word: 'ללוות', transliteration: 'lilvot', meaning: 'أن يستعير / يقترض', prompt: 'اختر المعنى الصحيح:', options: ['أن يبيع', 'أن يوفّر', 'أن يستعير / يقترض', 'أن يشتري'], correctAnswer: 'أن يستعير / يقترض', sentence: 'רוכשי דירות רבים נאלצים ללוות כסף מהבנק.' },
  { word: 'נאלץ', transliteration: 'neelats', meaning: 'اضطرّ', prompt: 'ما معنى الكلمة؟', options: ['اختار', 'اضطرّ', 'استطاع', 'توقّع'], correctAnswer: 'اضطرّ', sentence: 'מרבית רוכשי הדירות נאלצים ללוות כסף.' },
  { word: 'להימנע', transliteration: 'lehimana', meaning: 'أن يتجنّب', prompt: 'ما المعنى الأقرب؟', options: ['أن يواجه', 'أن يجرّب', 'أن يتجنّب', 'أن يطلب'], correctAnswer: 'أن يتجنّب', sentence: 'מכבי האש ביקשו להימנע מהדלקת מדורות.' },
  { word: 'למנוע', transliteration: 'limnoa', meaning: 'أن يمنع', prompt: 'اختر الترجمة الصحيحة:', options: ['أن يمنع', 'أن يطوّر', 'أن يصف', 'أن يعلن'], correctAnswer: 'أن يمنع', sentence: 'כדי למנוע שרפות, התושבים התבקשו להיזהר.' },
  { word: 'להשקיע', transliteration: 'lehashkia', meaning: 'أن يستثمر', prompt: 'ماذا تعني الكلمة؟', options: ['أن يخسر', 'أن يستثمر', 'أن يقترض', 'أن يحسب'], correctAnswer: 'أن يستثمر', sentence: 'חשוב להשקיע ביצירת תנאי עבודה בטוחים.' },
  { word: 'רווח', transliteration: 'revach', meaning: 'ربح', prompt: 'ما معنى الكلمة؟', options: ['دين', 'خسارة', 'ربح', 'ثمن'], correctAnswer: 'ربح', sentence: 'בעלי מפעלים רוצים להגדיל את רווחיהם.' },
  { word: 'פיקוח', transliteration: 'pikuach', meaning: 'رقابة / إشراف', prompt: 'اختر المعنى الصحيح:', options: ['تعاون', 'رقابة / إشراف', 'منافسة', 'تجارة'], correctAnswer: 'رقابة / إشراف', sentence: 'פיקוח ממשלתי יכול להגן על העובדים.' },
  { word: 'להגביל', transliteration: 'lehagbil', meaning: 'أن يقيّد / يحدّ', prompt: 'ما المعنى الأقرب؟', options: ['أن يوسّع', 'أن يقيّد / يحدّ', 'أن يسمح', 'أن يحرّر'], correctAnswer: 'أن يقيّد / يحدّ', sentence: 'הממשלה יכולה להגביל את כמות הגזים המזהמים.' },
  { word: 'סכנה', transliteration: 'sakana', meaning: 'خطر', prompt: 'ماذا تعني الكلمة؟', options: ['عناية', 'خطر', 'نجاح', 'اقتراح'], correctAnswer: 'خطر', sentence: 'בימים חמים במיוחד סכנת השרפות גדלה.' },
  { word: 'לבטל', transliteration: 'levatel', meaning: 'أن يلغي', prompt: 'اختر الترجمة الصحيحة:', options: ['أن يؤكّد', 'أن يلغي', 'أن يضيف', 'أن يتابع'], correctAnswer: 'أن يلغي', sentence: 'התושבים דרשו לבטל את התקנות.' },
  { word: 'פגיעה', transliteration: 'pgia', meaning: 'ضرر / أذى', prompt: 'ما معنى الكلمة؟', options: ['ضرر / أذى', 'فائدة', 'تغيير', 'موافقة'], correctAnswer: 'ضرر / أذى', sentence: 'פיקוח יכול לצמצם את הפגיעה באיכות הסביבה.' },
  { word: 'מורכב', transliteration: 'murkav', meaning: 'معقّد', prompt: 'ما المعنى الأقرب؟', options: ['ناجح', 'بسيط', 'معقّد', 'مؤقّت'], correctAnswer: 'معقّد', sentence: 'תהליך הייצור של המוצרים מורכב.' },
  { word: 'הפרדה', transliteration: 'hafrada', meaning: 'فصل / تمييز', prompt: 'ماذا تعني الكلمة؟', options: ['مساواة', 'فصل / تمييز', 'موافقة', 'مصالحة'], correctAnswer: 'فصل / تمييز', sentence: 'פארקס נאבקה בהפרדה הגזעית.' },
  { word: 'חרם', transliteration: 'cherem', meaning: 'مقاطعة', prompt: 'اختر المعنى الصحيح:', options: ['مظاهرة', 'مقابلة', 'مقاطعة', 'احتفال'], correctAnswer: 'مقاطعة', sentence: 'התושבים הכריזו חרם על חברות האוטובוסים.' },
];

export type ReadingQuestion = {
  passage: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  meaning: string;
};

export const READING_QUESTIONS: ReadingQuestion[] = [
  {
    passage: 'אנשים רבים בוחרים ללמוד שפה חדשה. הלימוד דורש זמן וסבלנות, אך הוא מאפשר להכיר אנשים ותרבויות אחרות.',
    prompt: 'לפי הקטע, מה הלימוד מאפשר?',
    options: ['להכיר תרבויות אחרות', 'לסיים את כל העבודה', 'לנסוע בכל יום', 'ללמוד בלי מאמץ'],
    correctAnswer: 'להכיר תרבויות אחרות',
    meaning: 'التعرّف على ثقافات أخرى',
  },
  {
    passage: 'הספרייה העירונית פתוחה גם בערב. תלמידים רבים מגיעים אליה כדי לקרוא, ללמוד ולהכין עבודות.',
    prompt: 'מתי הספרייה פתוחה?',
    options: ['רק בבוקר', 'גם בערב', 'רק בסוף השבוע', 'בצהריים בלבד'],
    correctAnswer: 'גם בערב',
    meaning: 'المكتبة مفتوحة أيضًا في المساء',
  },
  {
    passage: 'דנה הולכת ברגל לעבודה שלוש פעמים בשבוע. היא אומרת שההליכה עוזרת לה להרגיש בריאה ורגועה.',
    prompt: 'למה דנה הולכת ברגל?',
    options: ['כי אין לה עבודה', 'כדי להרגיש בריאה ורגועה', 'כדי לפגוש חברים', 'כי היא מאחרת'],
    correctAnswer: 'כדי להרגיש בריאה ורגועה',
    meaning: 'لأن المشي يساعدها على الشعور بصحة وهدوء',
  },
  {
    passage: 'העירייה פתחה גינה חדשה ליד בית הספר. בגינה יש עצים, ספסלים ומקום לילדים לשחק.',
    prompt: 'איפה נמצאת הגינה החדשה?',
    options: ['ליד בית הספר', 'במרכז העיר', 'מאחורי התחנה', 'ליד הספרייה'],
    correctAnswer: 'ליד בית הספר',
    meaning: 'الحديقة الجديدة قرب المدرسة',
  },
  {
    passage: 'מחקר חדש מצא כי שינה טובה עוזרת לתלמידים להתרכז. לכן מומלץ לישון מספיק לפני יום לימודים.',
    prompt: 'מה עוזרת שינה טובה לעשות?',
    options: ['להתרכז', 'לקרוא מהר', 'לכתוב יפה', 'ללמוד בלילה'],
    correctAnswer: 'להתרכז',
    meaning: 'النوم الجيد يساعد الطلاب على التركيز',
  },
];
