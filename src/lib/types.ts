// Data model - mirrors the UML class diagram in the SRS (Appendix B).
// User is the parent of YouthWorker and Employer; role-specific fields are optional.

export type Role = "worker" | "employer" | "mentor" | "admin" | "partner" | "governor";
export type Lang = "en" | "sw" | "ar" | "fr";
export type VerificationMethod = "unhcr" | "otp" | "email" | "document";

export interface User {
  id: string; // userId: UUID
  name: string;
  email: string;
  phone: string;
  password?: string; // only used by seed data - the server stores bcrypt hashes, never sent to clients
  role: Role;
  unhcrId?: string;
  verifiedBy: VerificationMethod;
  language: Lang;
  location: string;
  nationality: string;
  gender: "Female" | "Male" | "Other";
  createdAt: string;
  // YouthWorker
  skills: string[];
  portfolioUrl?: string;
  bio?: string;
  rating?: number;
  goal?: string;
  // Employer
  companyName?: string;
  companyRegNo?: string;
  employerStatus?: "pending" | "verified" | "rejected";
  antiExploitationAgreed?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  minutes: number;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
}

export interface Course {
  id: string; // courseId
  title: string;
  domain: string;
  description: string;
  level: "Beginner" | "Intermediate";
  hours: number;
  offlineAvail: boolean;
  sizeKb: number;
  lessons: Lesson[];
  quiz: QuizQuestion[];
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  completedLessons: string[];
  bestScore: number | null;
  attempts: number;
  passed: boolean;
  downloaded: boolean;
  startedAt: string;
}

export interface Certificate {
  id: string; // certId: UUID
  userId: string;
  courseId: string;
  score: number;
  issueDate: string;
  ipfsHash: string; // SHA-256 of the certificate payload (stands in for IPFS hash)
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  domain: string;
  description: string;
  compensation: number; // USD
  timeCommitment: "Part-time" | "Full-time" | "Short project";
  experience: "Entry" | "Intermediate";
  language: string;
  status: "open" | "closed";
  flagged: boolean;
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  coverLetter: string;
  status: "submitted" | "shortlisted" | "accepted" | "rejected";
  createdAt: string;
}

export interface Submission {
  id: string;
  note: string;
  link: string;
  at: string;
  feedback?: string;
  decision?: "revision" | "approved";
}

export type ContractStatus =
  | "awaiting_signatures"
  | "active"
  | "submitted"
  | "revision"
  | "approved"
  | "paid"
  | "disputed";

export interface Contract {
  id: string; // contractId
  jobId: string;
  workerId: string;
  employerId: string;
  deliverables: string;
  paymentTerms: string;
  amount: number;
  disputeClause: string;
  workerSigned: boolean;
  employerSigned: boolean;
  status: ContractStatus;
  submissions: Submission[];
  dispute?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "earning" | "fee" | "withdrawal" | "deposit" | "payment";
  amount: number; // signed, USD
  description: string;
  method: string;
  ref: string;
  at: string;
}

export interface Rating {
  id: string;
  contractId: string;
  fromId: string;
  toId: string;
  stars: number;
  comment: string;
  at: string;
}

export interface Cohort {
  id: string; // cohortId
  name: string;
  domain: string;
  mentorId: string;
  memberIds: string[];
  createdAt: string;
}

export interface Post {
  id: string;
  cohortId: string;
  authorId: string;
  text: string;
  at: string;
  flagged: boolean;
  hidden: boolean;
}

export interface Policy {
  id: string;
  title: string;
  description: string;
  proposerId: string;
  at: string;
  status: "open" | "closed";
  votesFor: string[];
  votesAgainst: string[];
}

export interface SafeguardReport {
  id: string;
  category: string;
  description: string;
  at: string;
  status: "new" | "escalated" | "resolved";
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  href?: string;
  at: string;
  read: boolean;
}

export interface DB {
  version: number;
  users: User[];
  courses: Course[];
  enrollments: Enrollment[];
  certificates: Certificate[];
  jobs: Job[];
  applications: Application[];
  contracts: Contract[];
  transactions: Transaction[];
  ratings: Rating[];
  cohorts: Cohort[];
  posts: Post[];
  policies: Policy[];
  reports: SafeguardReport[];
  notifications: Notification[];
}
