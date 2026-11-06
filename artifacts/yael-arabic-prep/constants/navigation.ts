// Shared with the home scroll clearance so the fixed web tabs cannot cover it.
export const WEB_TAB_BAR_HEIGHT = 84;

export type MenuDestination = {
  key: string; href: string; title: string; caption: string;
  icon: string; tone: 'brand' | 'sky' | 'sun' | 'coral';
};

/** Grouped app menu destinations (labels only, no source/model codes). */
export const MENU_GROUPS: { key: string; title: string; items: MenuDestination[] }[] = [
  { key: 'learn', title: 'تعلّم وتدرّب', items: [
    { key: 'practice', href: '/practice?section=vocabulary', title: 'المفردات', caption: 'جولة كلمات قصيرة', icon: 'book-open', tone: 'brand' },
    { key: 'restatement', href: '/restatement', title: 'إعادة الصياغة', caption: 'قلها بطريقة أخرى', icon: 'repeat', tone: 'coral' },
    { key: 'reading', href: '/reading', title: 'فهم المقروء', caption: 'نصوص وأسئلة', icon: 'file-text', tone: 'sky' },
    { key: 'flashcards', href: '/flashcards', title: 'البطاقات', caption: 'راجع بسرعة', icon: 'layers', tone: 'sun' },
    { key: 'study', href: '/study', title: 'ركن الدراسة', caption: 'دروس مع المعلّمين', icon: 'compass', tone: 'sky' },
  ]},
  { key: 'exam', title: 'استعدّ للامتحان', items: [
    { key: 'timed', href: '/source-session', title: 'تدريب بوقت', caption: 'جلسة مؤقّتة', icon: 'clock', tone: 'coral' },
    { key: 'library', href: '/exam-library', title: 'مكتبة النماذج', caption: 'نماذج كاملة', icon: 'archive', tone: 'brand' },
  ]},
  { key: 'me', title: 'أنت', items: [
    { key: 'progress', href: '/progress', title: 'تقدّمي', caption: 'إنجازك حتى الآن', icon: 'bar-chart-2', tone: 'sun' },
    { key: 'profile', href: '/profile', title: 'حسابي', caption: 'الإعدادات والاشتراك', icon: 'user', tone: 'brand' },
  ]},
];

/** Classic dock tabs, in visual (RTL) order. */
export const DOCK_TABS: Record<string, { title: string; icon: string }> = {
  menu: { title: 'القائمة', icon: 'grid' },
  practice: { title: 'تدرّب', icon: 'book-open' },
  progress: { title: 'تقدّمي', icon: 'bar-chart-2' },
  index: { title: 'الرئيسية', icon: 'home' },
};

/** Routes without their own dock entry highlight a dock group instead. */
export const DOCK_GROUP_OF: Record<string, string> = { profile: 'menu' };
