"use client";
// Multi-language support (SRS 6.1 d). English, Kiswahili, Arabic (RTL) and French in this release.
// Somali and other languages are planned - add a new dictionary below to extend.
import { useStore } from "./store";
import type { Lang } from "./types";

export const LANGS: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "sw", label: "Kiswahili", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "fr", label: "Français", dir: "ltr" },
];

type Dict = Record<string, string>;

const en: Dict = {
  dashboard: "Dashboard",
  courses: "Courses",
  certificates: "Certificates",
  jobs: "Jobs",
  applications: "Applications",
  contracts: "Contracts",
  wallet: "Wallet",
  guidance: "Career guidance",
  cohorts: "Cohorts",
  governance: "Governance",
  impact: "Impact dashboard",
  admin: "Admin",
  myJobs: "My jobs",
  profile: "Profile",
  report: "Report a concern",
  logout: "Log out",
  login: "Log in",
  signup: "Sign up",
  welcome: "Welcome back",
  balance: "Wallet balance",
  continueLearning: "Continue learning",
  recommendedJobs: "Recommended for you",
  apply: "Apply",
  applied: "Applied",
  search: "Search",
  notifications: "Notifications",
  noNotifications: "No notifications yet",
  language: "Language",
  offline: "You are offline - showing saved data. Changes sync when you reconnect.",
  getStarted: "Get started",
  tagline: "Learn digital skills. Get verified. Earn from remote work.",
  postJob: "Post a job",
  withdraw: "Withdraw",
  save: "Save",
  cancel: "Cancel",
  viewAll: "View all",
  startCourse: "Start course",
  takeQuiz: "Take quiz",
  allDomains: "All domains",
};

const sw: Dict = {
  dashboard: "Dashibodi",
  courses: "Kozi",
  certificates: "Vyeti",
  jobs: "Kazi",
  applications: "Maombi",
  contracts: "Mikataba",
  wallet: "Pochi",
  guidance: "Ushauri wa kazi",
  cohorts: "Vikundi",
  governance: "Utawala",
  impact: "Matokeo",
  admin: "Msimamizi",
  myJobs: "Kazi zangu",
  profile: "Wasifu",
  report: "Ripoti tatizo",
  logout: "Toka",
  login: "Ingia",
  signup: "Jisajili",
  welcome: "Karibu tena",
  balance: "Salio la pochi",
  continueLearning: "Endelea kujifunza",
  recommendedJobs: "Zinazopendekezwa kwako",
  apply: "Omba",
  applied: "Umeomba",
  search: "Tafuta",
  notifications: "Arifa",
  noNotifications: "Hakuna arifa bado",
  language: "Lugha",
  offline: "Uko nje ya mtandao - unaona data iliyohifadhiwa. Mabadiliko yatasawazishwa ukiunganishwa.",
  getStarted: "Anza sasa",
  tagline: "Jifunze ujuzi wa kidijitali. Thibitishwa. Pata kipato kwa kazi za mbali.",
  postJob: "Tangaza kazi",
  withdraw: "Toa pesa",
  save: "Hifadhi",
  cancel: "Ghairi",
  viewAll: "Ona zote",
  startCourse: "Anza kozi",
  takeQuiz: "Fanya jaribio",
  allDomains: "Nyanja zote",
};

const ar: Dict = {
  dashboard: "لوحة التحكم",
  courses: "الدورات",
  certificates: "الشهادات",
  jobs: "الوظائف",
  applications: "الطلبات",
  contracts: "العقود",
  wallet: "المحفظة",
  guidance: "الإرشاد المهني",
  cohorts: "المجموعات",
  governance: "الحوكمة",
  impact: "الأثر",
  admin: "الإدارة",
  myJobs: "وظائفي",
  profile: "الملف الشخصي",
  report: "الإبلاغ عن مشكلة",
  logout: "تسجيل الخروج",
  login: "تسجيل الدخول",
  signup: "إنشاء حساب",
  welcome: "مرحباً بعودتك",
  balance: "رصيد المحفظة",
  continueLearning: "تابع التعلم",
  recommendedJobs: "مقترحة لك",
  apply: "قدّم الآن",
  applied: "تم التقديم",
  search: "بحث",
  notifications: "الإشعارات",
  noNotifications: "لا توجد إشعارات بعد",
  language: "اللغة",
  offline: "أنت غير متصل - تُعرض البيانات المحفوظة. ستتم المزامنة عند الاتصال.",
  getStarted: "ابدأ الآن",
  tagline: "تعلّم المهارات الرقمية. احصل على التوثيق. اكسب من العمل عن بُعد.",
  postJob: "نشر وظيفة",
  withdraw: "سحب",
  save: "حفظ",
  cancel: "إلغاء",
  viewAll: "عرض الكل",
  startCourse: "ابدأ الدورة",
  takeQuiz: "ابدأ الاختبار",
  allDomains: "كل المجالات",
};

const fr: Dict = {
  dashboard: "Tableau de bord",
  courses: "Cours",
  certificates: "Certificats",
  jobs: "Emplois",
  applications: "Candidatures",
  contracts: "Contrats",
  wallet: "Portefeuille",
  guidance: "Orientation",
  cohorts: "Cohortes",
  governance: "Gouvernance",
  impact: "Impact dashboard",
  admin: "Admin",
  myJobs: "Mes offres",
  profile: "Profil",
  report: "Signaler un problème",
  logout: "Déconnexion",
  login: "Connexion",
  signup: "S'inscrire",
  welcome: "Bon retour",
  balance: "Solde du portefeuille",
  continueLearning: "Continuer à apprendre",
  recommendedJobs: "Recommandé pour vous",
  apply: "Postuler",
  applied: "Candidature envoyée",
  search: "Rechercher",
  notifications: "Notifications",
  noNotifications: "Aucune notification",
  language: "Langue",
  offline: "Vous êtes hors ligne - données enregistrées affichées. Synchronisation à la reconnexion.",
  getStarted: "Commencer",
  tagline: "Apprenez le numérique. Faites-vous certifier. Gagnez avec le travail à distance.",
  postJob: "Publier une offre",
  withdraw: "Retirer",
  save: "Enregistrer",
  cancel: "Annuler",
  viewAll: "Voir tout",
  startCourse: "Commencer le cours",
  takeQuiz: "Passer le quiz",
  allDomains: "Tous les domaines",
};

const DICTS: Record<Lang, Dict> = { en, sw, ar, fr };

export function getStoredLang(): Lang {
  try {
    const l = localStorage.getItem("kdwc-lang") as Lang | null;
    if (l && DICTS[l]) return l;
  } catch {}
  return "en";
}

export function useT() {
  const { user, db } = useStore();
  const lang: Lang = user?.language ?? (db ? getStoredLang() : "en");
  const dict = DICTS[lang] ?? en;
  const t = (key: string) => dict[key] ?? en[key] ?? key;
  const dir = LANGS.find((l) => l.code === lang)?.dir ?? "ltr";
  return { t, lang, dir };
}
