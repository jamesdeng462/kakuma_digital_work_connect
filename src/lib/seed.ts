import { COURSES } from "./courses";
import { sha256 } from "./sha256";
import type { DB, User, Transaction } from "./types";

export const DB_VERSION = 3;
export const DEMO_PASSWORD = "Demo1234!";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function worker(
  id: string,
  name: string,
  email: string,
  nationality: string,
  gender: User["gender"],
  skills: string[],
  extra: Partial<User> = {}
): User {
  return {
    id,
    name,
    email,
    phone: "+2547" + id.replace(/\D/g, "").padStart(8, "1").slice(0, 8),
    password: DEMO_PASSWORD,
    role: "worker",
    unhcrId: "KAK-" + (200000 + id.length * 1371 + name.length * 97).toString().slice(0, 6),
    verifiedBy: "unhcr",
    language: "en",
    location: "Kakuma, Turkana County",
    nationality,
    gender,
    createdAt: daysAgo(60),
    skills,
    rating: 4.5,
    ...extra,
  };
}

function cert(userId: string, courseId: string, score: number, days: number) {
  const id = sha256(userId + courseId).slice(0, 8) + "-" + sha256(courseId + userId).slice(0, 4) + "-4" + sha256(userId).slice(0, 3) + "-a" + sha256(courseId).slice(0, 3) + "-" + sha256(userId + score).slice(0, 12);
  const issueDate = daysAgo(days);
  return { id, userId, courseId, score, issueDate, ipfsHash: sha256(`${id}|${userId}|${courseId}|${score}|${issueDate}`) };
}

export function createSeed(): DB {
  const users: User[] = [
    worker("u-worker", "Achol Garang", "worker@kdwc.demo", "South Sudan", "Female", ["Data Entry", "Excel", "English", "Arabic", "Typing 45 wpm"], {
      unhcrId: "KAK-204118",
      bio: "Hard-working youth from Kakuma 3 with strong typing and spreadsheet skills. Looking for remote data and admin work.",
      portfolioUrl: "https://example.com/achol-portfolio",
      goal: "Data & admin work",
      rating: 4.8,
      phone: "+254712000001",
    }),
    worker("u-w2", "Jean-Paul Mugisha", "jeanpaul@kdwc.demo", "DR Congo", "Male", ["Data Annotation", "French", "Swahili"], { rating: 4.6 }),
    worker("u-w3", "Hodan Abdi", "hodan@kdwc.demo", "Somalia", "Female", ["Customer Service", "Somali", "English"], { rating: 4.7 }),
    worker("u-w4", "Lokwang Ekai", "lokwang@kdwc.demo", "Kenya (host community)", "Male", ["Graphic Design", "Turkana", "Swahili"], { verifiedBy: "otp", unhcrId: undefined, rating: 4.4 }),
    worker("u-w5", "Mekdes Tesfaye", "mekdes@kdwc.demo", "Ethiopia", "Female", ["Web Development", "HTML", "CSS", "Amharic"], { rating: 4.9 }),
    worker("u-w6", "Ariel Ndayishimiye", "ariel@kdwc.demo", "Burundi", "Male", ["Digital Marketing", "Kirundi", "French"], { rating: 4.3 }),
    worker("u-w7", "Nyakim Gatwech", "nyakim@kdwc.demo", "South Sudan", "Female", ["Data Entry", "Nuer", "English"]),
    worker("u-w8", "Abdirahman Yusuf", "abdirahman@kdwc.demo", "Somalia", "Male", ["Data Annotation", "Somali", "Arabic"]),
    worker("u-w9", "Esther Akai", "esther@kdwc.demo", "Kenya (host community)", "Female", ["Customer Service", "Turkana", "English"], { verifiedBy: "otp", unhcrId: undefined }),
    worker("u-w10", "Daniel Haile", "daniel@kdwc.demo", "Eritrea", "Male", ["Data Entry", "Tigrinya", "English"]),
    {
      id: "u-employer", name: "Grace Wanjiru", email: "employer@kdwc.demo", phone: "+254722000002", password: DEMO_PASSWORD,
      role: "employer", verifiedBy: "email", language: "en", location: "Nairobi, Kenya", nationality: "Kenya", gender: "Female",
      createdAt: daysAgo(90), skills: [], companyName: "Savanna Data Labs", companyRegNo: "PVT-2019-88431",
      employerStatus: "verified", antiExploitationAgreed: true, rating: 4.7,
      bio: "Impact-sourcing data company serving research and NGO clients across East Africa.",
    },
    {
      id: "u-employer2", name: "Daniel Mwangi", email: "eastbridge@kdwc.demo", phone: "+254733000003", password: DEMO_PASSWORD,
      role: "employer", verifiedBy: "email", language: "en", location: "Kigali, Rwanda", nationality: "Rwanda", gender: "Male",
      createdAt: daysAgo(70), skills: [], companyName: "EastBridge Support", companyRegNo: "RW-102-7781",
      employerStatus: "verified", antiExploitationAgreed: true, rating: 4.5,
    },
    {
      id: "u-pending", name: "Tom Okello", email: "pending@kdwc.demo", phone: "+256700000004", password: DEMO_PASSWORD,
      role: "employer", verifiedBy: "email", language: "en", location: "Kampala, Uganda", nationality: "Uganda", gender: "Male",
      createdAt: daysAgo(2), skills: [], companyName: "BrightPixel Studio", companyRegNo: "UG-80012345",
      employerStatus: "pending", antiExploitationAgreed: true,
    },
    {
      id: "u-mentor", name: "Nyabol Kuol", email: "mentor@kdwc.demo", phone: "+254712000005", password: DEMO_PASSWORD,
      role: "mentor", verifiedBy: "unhcr", unhcrId: "KAK-118204", language: "en", location: "Kakuma 1", nationality: "South Sudan",
      gender: "Female", createdAt: daysAgo(120), skills: ["Facilitation", "Data Entry", "Mentorship"],
    },
    {
      id: "u-admin", name: "Samuel Otieno", email: "admin@kdwc.demo", phone: "+254712000006", password: DEMO_PASSWORD,
      role: "admin", verifiedBy: "email", language: "en", location: "Kakuma Operations Office", nationality: "Kenya",
      gender: "Male", createdAt: daysAgo(150), skills: [],
    },
    {
      id: "u-partner", name: "Fatuma Hassan", email: "partner@kdwc.demo", phone: "+254712000007", password: DEMO_PASSWORD,
      role: "partner", verifiedBy: "email", language: "en", location: "Kakuma", nationality: "Kenya", gender: "Female",
      createdAt: daysAgo(150), skills: [], companyName: "Humanitarian Partner (demo)",
    },
    {
      id: "u-governor", name: "Peter Lomongin", email: "governor@kdwc.demo", phone: "+254712000008", password: DEMO_PASSWORD,
      role: "governor", verifiedBy: "otp", language: "en", location: "Kalobeyei Settlement", nationality: "Kenya (host community)",
      gender: "Male", createdAt: daysAgo(100), skills: ["Community organising"],
    },
  ];

  const certificates = [
    cert("u-worker", "c-data-entry", 90, 40),
    cert("u-worker", "c-financial-literacy", 100, 30),
    cert("u-w2", "c-data-annotation", 100, 35),
    cert("u-w3", "c-customer-service", 100, 33),
    cert("u-w4", "c-graphic-design", 75, 28),
    cert("u-w5", "c-web-dev", 100, 25),
    cert("u-w6", "c-digital-marketing", 100, 20),
    cert("u-w7", "c-data-entry", 80, 18),
    cert("u-w8", "c-data-annotation", 100, 15),
    cert("u-w10", "c-data-entry", 80, 6),
  ];

  const enrollments = [
    ...certificates.map((c, i) => {
      const course = COURSES.find((x) => x.id === c.courseId)!;
      return {
        id: "e" + i, userId: c.userId, courseId: c.courseId, completedLessons: course.lessons.map((l) => l.id),
        bestScore: c.score, attempts: 1, passed: true, downloaded: false, startedAt: daysAgo(50),
      };
    }),
    { id: "e-gd", userId: "u-worker", courseId: "c-graphic-design", completedLessons: ["l1"], bestScore: null, attempts: 0, passed: false, downloaded: true, startedAt: daysAgo(5) },
    { id: "e-w9", userId: "u-w9", courseId: "c-customer-service", completedLessons: ["l1", "l2"], bestScore: 33, attempts: 1, passed: false, downloaded: false, startedAt: daysAgo(4) },
  ];

  const jobs = [
    { id: "j1", employerId: "u-employer", title: "Digitise 500 household survey forms", domain: "Data Entry", description: "Enter handwritten survey responses into a provided Google Sheet template. Double-entry checks required. Forms are scanned PDFs.", compensation: 120, timeCommitment: "Short project", experience: "Entry", language: "English", status: "open", flagged: false, createdAt: daysAgo(3) },
    { id: "j2", employerId: "u-employer", title: "Image annotation - farm crop photos", domain: "Data Annotation", description: "Draw bounding boxes around maize and sorghum plants in 2,000 images following our guideline document.", compensation: 200, timeCommitment: "Part-time", experience: "Entry", language: "English", status: "open", flagged: false, createdAt: daysAgo(4) },
    { id: "j3", employerId: "u-employer2", title: "Arabic & English chat support agent", domain: "Customer Service", description: "Answer customer chats for an e-commerce client, 4 hours per day, Sunday–Thursday.", compensation: 300, timeCommitment: "Part-time", experience: "Entry", language: "Arabic", status: "open", flagged: false, createdAt: daysAgo(2) },
    { id: "j4", employerId: "u-employer", title: "Clean and de-duplicate NGO beneficiary spreadsheet", domain: "Data Entry", description: "Remove duplicates, standardise names and phone formats in a 4,000-row spreadsheet. Confidentiality agreement required.", compensation: 90, timeCommitment: "Short project", experience: "Entry", language: "English", status: "open", flagged: false, createdAt: daysAgo(1) },
    { id: "j5", employerId: "u-employer2", title: "Social media graphics for a coffee brand", domain: "Graphic Design", description: "Design 12 Instagram posts and 4 stories using the brand kit provided.", compensation: 150, timeCommitment: "Short project", experience: "Entry", language: "English", status: "open", flagged: false, createdAt: daysAgo(6) },
    { id: "j6", employerId: "u-employer2", title: "Landing page for a community school", domain: "Web Development", description: "Build a responsive one-page website in HTML/CSS with contact form link and photo gallery.", compensation: 250, timeCommitment: "Short project", experience: "Intermediate", language: "English", status: "open", flagged: false, createdAt: daysAgo(7) },
    { id: "j7", employerId: "u-employer", title: "Caption writer - Swahili & English", domain: "Digital Marketing", description: "Write 30 short social media captions per week for a Nairobi retail client.", compensation: 110, timeCommitment: "Part-time", experience: "Entry", language: "Swahili", status: "open", flagged: false, createdAt: daysAgo(5) },
    { id: "j8", employerId: "u-employer2", title: "Earn $500/day - pay registration fee to start", domain: "Data Entry", description: "Send $20 registration fee by mobile money to secure your spot. Unlimited earnings!", compensation: 500, timeCommitment: "Full-time", experience: "Entry", language: "English", status: "open", flagged: true, createdAt: daysAgo(1) },
    { id: "j0", employerId: "u-employer", title: "Transcribe health clinic intake records", domain: "Data Entry", description: "Type 300 clinic intake records into a secure form.", compensation: 100, timeCommitment: "Short project", experience: "Entry", language: "English", status: "closed", flagged: false, createdAt: daysAgo(40) },
    { id: "j-active", employerId: "u-employer", title: "Monthly sales ledger entry - Kakuma traders' cooperative", domain: "Data Entry", description: "Enter October sales ledgers for 40 traders into the cooperative's spreadsheet.", compensation: 80, timeCommitment: "Short project", experience: "Entry", language: "English", status: "closed", flagged: false, createdAt: daysAgo(10) },
  ] as DB["jobs"];

  const applications = [
    { id: "a1", jobId: "j2", workerId: "u-w2", coverLetter: "I completed Data Annotation for AI with 100% and have labelled 1,000+ images before.", status: "submitted", createdAt: daysAgo(2) },
    { id: "a2", jobId: "j2", workerId: "u-w8", coverLetter: "Certified annotator, available 5 hours per day.", status: "submitted", createdAt: daysAgo(1) },
    { id: "a3", jobId: "j1", workerId: "u-w7", coverLetter: "I type 50 wpm with high accuracy and passed Data Entry Fundamentals.", status: "shortlisted", createdAt: daysAgo(2) },
    { id: "a4", jobId: "j3", workerId: "u-worker", coverLetter: "I speak Arabic and English fluently and completed customer service training at the community centre.", status: "submitted", createdAt: daysAgo(1) },
    { id: "a0", jobId: "j0", workerId: "u-worker", coverLetter: "Certified in data entry.", status: "accepted", createdAt: daysAgo(38) },
    { id: "a-active", jobId: "j-active", workerId: "u-worker", coverLetter: "I am familiar with ledger formats.", status: "accepted", createdAt: daysAgo(9) },
  ] as DB["applications"];

  const contracts = [
    {
      id: "ct-paid", jobId: "j0", workerId: "u-worker", employerId: "u-employer",
      deliverables: "300 clinic intake records typed into the secure form with <1% error rate.",
      paymentTerms: "USD 100 paid on approval via KDWC wallet (M-Pesa). 5% platform fee deducted.", amount: 100,
      disputeClause: "Disputes are raised in-app and reviewed by the KDWC dispute panel within 7 business days.",
      workerSigned: true, employerSigned: true, status: "paid",
      submissions: [{ id: "s0", note: "All 300 records entered and double-checked.", link: "https://example.com/delivery/clinic-records", at: daysAgo(31), feedback: "Excellent accuracy, thank you!", decision: "approved" }],
      createdAt: daysAgo(37),
    },
    {
      id: "ct-active", jobId: "j-active", workerId: "u-worker", employerId: "u-employer",
      deliverables: "October sales ledgers for 40 traders entered into the cooperative spreadsheet, with totals checked.",
      paymentTerms: "USD 80 paid on approval via KDWC wallet (M-Pesa). 5% platform fee deducted.", amount: 80,
      disputeClause: "Disputes are raised in-app and reviewed by the KDWC dispute panel within 7 business days.",
      workerSigned: true, employerSigned: true, status: "active", submissions: [], createdAt: daysAgo(8),
    },
  ] as DB["contracts"];

  // Earnings history for analytics (worker) + employer funding
  const transactions: Transaction[] = [];
  const earningHistory: [string, number, number, string][] = [
    ["u-worker", 60, 95, "Survey cleaning - Savanna Data Labs"],
    ["u-worker", 45, 70, "Form digitisation - EastBridge Support"],
    ["u-worker", 31, 100, "Clinic intake records - Savanna Data Labs"],
    ["u-w2", 40, 180, "Image annotation batch"],
    ["u-w2", 12, 150, "Image annotation batch 2"],
    ["u-w3", 25, 240, "Chat support - October"],
    ["u-w5", 20, 260, "School website"],
    ["u-w4", 14, 130, "Poster series"],
    ["u-w6", 9, 100, "Caption writing"],
    ["u-w7", 5, 85, "Ledger entry"],
  ];
  earningHistory.forEach(([uid, d, amt, desc], i) => {
    const ref = "MP" + (7310000 + i * 7919);
    transactions.push({ id: "t-e" + i, userId: uid, type: "earning", amount: amt, description: desc, method: "M-Pesa (sandbox)", ref, at: daysAgo(d) });
    transactions.push({ id: "t-f" + i, userId: uid, type: "fee", amount: -Math.round(amt * 0.05 * 100) / 100, description: "Platform fee (5%)", method: "KDWC", ref, at: daysAgo(d) });
  });
  transactions.push({ id: "t-w1", userId: "u-worker", type: "withdrawal", amount: -120, description: "Withdrawal to M-Pesa +254712000001", method: "M-Pesa (sandbox)", ref: "MP7399011", at: daysAgo(28) });
  transactions.push({ id: "t-d1", userId: "u-employer", type: "deposit", amount: 2000, description: "Wallet top-up", method: "SWIFT bank transfer (sandbox)", ref: "SW55120", at: daysAgo(80) });
  transactions.push({ id: "t-p1", userId: "u-employer", type: "payment", amount: -100, description: "Payment - Clinic intake records", method: "KDWC wallet", ref: "MP7333676", at: daysAgo(31) });
  transactions.push({ id: "t-d2", userId: "u-employer2", type: "deposit", amount: 1500, description: "Wallet top-up", method: "SWIFT bank transfer (sandbox)", ref: "SW55188", at: daysAgo(60) });

  const ratings = [
    { id: "r1", contractId: "ct-paid", fromId: "u-employer", toId: "u-worker", stars: 5, comment: "Fast, accurate and great communication.", at: daysAgo(30) },
    { id: "r2", contractId: "ct-paid", fromId: "u-worker", toId: "u-employer", stars: 5, comment: "Clear instructions and paid on time.", at: daysAgo(30) },
  ];

  const cohorts = [
    { id: "co1", name: "Data Skills Cohort A", domain: "Data Entry", mentorId: "u-mentor", memberIds: ["u-worker", "u-w2", "u-w3", "u-w4", "u-w7", "u-w8", "u-w9", "u-w10"], createdAt: daysAgo(45) },
    { id: "co2", name: "Creative Digital Cohort", domain: "Graphic Design", mentorId: "u-mentor", memberIds: ["u-w4", "u-w5", "u-w6"], createdAt: daysAgo(10) },
  ];

  const posts = [
    { id: "p1", cohortId: "co1", authorId: "u-mentor", text: "Welcome everyone! This week: finish Lesson 2 (Spreadsheet basics) and share one question you had.", at: daysAgo(6), flagged: false, hidden: false },
    { id: "p2", cohortId: "co1", authorId: "u-worker", text: "Tip: sorting a column helped me find two typing mistakes before submitting. Try it!", at: daysAgo(4), flagged: false, hidden: false },
    { id: "p3", cohortId: "co1", authorId: "u-w10", text: "Is there a faster way to check duplicates in a sheet?", at: daysAgo(2), flagged: false, hidden: false },
    { id: "p4", cohortId: "co1", authorId: "u-w8", text: "DM me for a job that pays $500 a day, just send a small fee first.", at: daysAgo(1), flagged: true, hidden: false },
  ];

  const policies = [
    { id: "po1", title: "Offline course downloads on Wi-Fi hotspots", description: "Partner with community centres so youth can download course packs for free on Wi-Fi and study offline at home.", proposerId: "u-governor", at: daysAgo(8), status: "open", votesFor: ["u-worker", "u-w2", "u-w3", "u-mentor"], votesAgainst: ["u-w6"] },
    { id: "po2", title: "Add Somali and Nuer language support", description: "Prioritise Somali and Nuer translations in the next release to include more young people in Kakuma.", proposerId: "u-governor", at: daysAgo(4), status: "open", votesFor: ["u-w3", "u-w8"], votesAgainst: [] },
    { id: "po3", title: "Minimum pay rate for all jobs", description: "All jobs on KDWC must pay at least USD 3 per hour of estimated work.", proposerId: "u-governor", at: daysAgo(30), status: "closed", votesFor: ["u-worker", "u-w2", "u-w3", "u-w4", "u-w5", "u-mentor"], votesAgainst: ["u-w10"] },
  ] as DB["policies"];

  const reports = [
    { id: "rep1", category: "Exploitation / scam", description: "A person in a cohort chat is asking youth to pay a fee to get a job.", at: daysAgo(1), status: "new" },
    { id: "rep2", category: "Harassment", description: "Received repeated inappropriate messages after a job interview.", at: daysAgo(12), status: "escalated" },
  ] as DB["reports"];

  const notifications = [
    { id: "n1", userId: "u-worker", text: "New job matches your Data Entry certificate: 'Clean and de-duplicate NGO beneficiary spreadsheet'", href: "/jobs", at: daysAgo(1), read: false },
    { id: "n2", userId: "u-worker", text: "Your contract 'Monthly sales ledger entry' is active. Submit your work when ready.", href: "/contracts/ct-active", at: daysAgo(8), read: false },
    { id: "n3", userId: "u-employer", text: "2 new applications for 'Image annotation - farm crop photos'", href: "/employer/jobs/j2", at: daysAgo(1), read: false },
    { id: "n4", userId: "u-admin", text: "New employer awaiting verification: BrightPixel Studio", href: "/admin?tab=employers", at: daysAgo(2), read: false },
    { id: "n5", userId: "u-admin", text: "2 items flagged for moderation", href: "/admin?tab=moderation", at: daysAgo(1), read: false },
  ];

  return {
    version: DB_VERSION,
    users,
    courses: COURSES,
    enrollments,
    certificates,
    jobs,
    applications,
    contracts,
    transactions,
    ratings,
    cohorts,
    posts,
    policies,
    reports,
    notifications,
  };
}
