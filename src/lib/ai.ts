// AI career guidance engine (SRS 6.2 k / sequence diagram "OpenAI API (career engine)").
// Prototype: transparent rule-based scoring that runs on-device (works offline, no data cost).
// Production: the same function signature would call the OpenAI API from the backend.
import type { DB, Job, User, Course } from "./types";

export interface JobMatch {
  job: Job;
  score: number;
  reasons: string[];
}

export function recommendJobs(db: DB, user: User): JobMatch[] {
  const passedDomains = new Set(
    db.certificates
      .filter((c) => c.userId === user.id)
      .map((c) => db.courses.find((x) => x.id === c.courseId)?.domain)
      .filter(Boolean) as string[]
  );
  const skills = user.skills.map((s) => s.toLowerCase());
  return db.jobs
    .filter((j) => j.status === "open" && !j.flagged)
    .map((job) => {
      let score = 20;
      const reasons: string[] = [];
      if (passedDomains.has(job.domain)) {
        score += 45;
        reasons.push(`You are certified in ${job.domain}`);
      }
      if (skills.some((s) => s.includes(job.domain.toLowerCase()) || job.domain.toLowerCase().includes(s))) {
        score += 15;
        reasons.push("Matches a skill on your profile");
      }
      if (skills.includes(job.language.toLowerCase())) {
        score += 10;
        reasons.push(`You speak ${job.language}`);
      }
      if (job.experience === "Entry") {
        score += 5;
        reasons.push("Entry-level friendly");
      }
      if (!reasons.length) reasons.push(`Complete a ${job.domain} course to qualify`);
      return { job, score: Math.min(score, 98), reasons };
    })
    .sort((a, b) => b.score - a.score);
}

export interface CourseSuggestion {
  course: Course;
  demand: number;
  reason: string;
}

/** Personalised learning path: courses not yet passed, ranked by open-job demand. */
export function recommendCourses(db: DB, user: User): CourseSuggestion[] {
  const passed = new Set(db.certificates.filter((c) => c.userId === user.id).map((c) => c.courseId));
  const openJobs = db.jobs.filter((j) => j.status === "open" && !j.flagged);
  return db.courses
    .filter((c) => !passed.has(c.id))
    .map((course) => {
      const demand = openJobs.filter((j) => j.domain === course.domain).length;
      const totalPay = openJobs.filter((j) => j.domain === course.domain).reduce((s, j) => s + j.compensation, 0);
      const reason =
        course.domain === "Financial Literacy"
          ? "Recommended for everyone who earns online"
          : demand
          ? `${demand} open job${demand > 1 ? "s" : ""} worth $${totalPay} need this skill`
          : "Builds your profile for future jobs";
      return { course, demand: course.domain === "Financial Literacy" ? 0.5 : demand, reason };
    })
    .sort((a, b) => b.demand - a.demand);
}
