"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Award, BookOpen, CheckCircle2, Circle, Download, PartyPopper, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Alert, Badge, Button, Card, Empty, LinkButton, Progress, cx } from "@/components/ui";
import { completeLesson, enroll, submitQuiz, toggleDownload, PASS_MARK } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function CoursePage() {
  return (
    <AppShell>
      <Suspense>
        <CourseDetail />
      </Suspense>
    </AppShell>
  );
}

function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { db, user } = useAuthed();
  const { t } = useT();
  const course = db.courses.find((c) => c.id === id);
  const enrollment = db.enrollments.find((e) => e.userId === user.id && e.courseId === id);
  const [lessonIdx, setLessonIdx] = useState<number | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; passed: boolean; certId?: string } | null>(null);

  if (!course) return <Empty title="Course not found"><Link href="/courses" className="text-brand-700">Back to courses</Link></Empty>;

  const isLearner = user.role === "worker";
  const done = enrollment?.completedLessons ?? [];
  const pct = Math.round((done.length / course.lessons.length) * 100);
  const allDone = done.length === course.lessons.length;
  const cert = db.certificates.find((c) => c.userId === user.id && c.courseId === course.id);

  const lesson = lessonIdx !== null ? course.lessons[lessonIdx] : null;

  const finishLesson = () => {
    if (lessonIdx === null) return;
    completeLesson(course.id, course.lessons[lessonIdx].id);
    if (lessonIdx < course.lessons.length - 1) setLessonIdx(lessonIdx + 1);
    else setLessonIdx(null);
  };

  const [busy, setBusy] = useState(false);
  const [quizError, setQuizError] = useState("");
  const submit = async () => {
    setBusy(true);
    setQuizError("");
    const r = await submitQuiz(course.id, answers);
    setBusy(false);
    if (r.ok) setResult({ score: r.score, passed: r.passed, certId: r.certId });
    else setQuizError(r.error);
  };

  return (
    <>
      <Link href="/courses" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft size={16} className="rtl-flip" /> {t("courses")}
      </Link>

      {params.get("welcome") && enrollment && done.length === 0 && (
        <div className="mb-4"><Alert kind="success">🎉 Welcome to KDWC, {user.name.split(" ")[0]}! Your account is ready. Start your first lesson below.</Alert></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Badge color="green">{course.domain}</Badge>
            <h1 className="mt-2 text-2xl font-bold">{course.title}</h1>
            <p className="mt-2 text-slate-600">{course.description}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
              <span>{course.level}</span>·<span>{course.hours} hours</span>·<span>{course.lessons.length} lessons</span>·<span>{course.quiz.length}-question quiz</span>·<span>Pass mark {PASS_MARK}%</span>
            </div>
            {isLearner && !enrollment && (
              <Button className="mt-5" onClick={() => enroll(course.id)}><BookOpen size={18} /> {t("startCourse")}</Button>
            )}
          </Card>

          {/* Lesson reader */}
          {lesson && !quizMode && (
            <Card className="border-brand-200">
              <p className="text-xs font-semibold uppercase text-brand-600">Lesson {lessonIdx! + 1} of {course.lessons.length} · {lesson.minutes} min</p>
              <h2 className="mt-1 text-xl font-bold">{lesson.title}</h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-800">{lesson.content}</p>
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setLessonIdx(null)}>Close</Button>
                <Button onClick={finishLesson}>
                  <CheckCircle2 size={18} /> {lessonIdx! < course.lessons.length - 1 ? "Mark complete & next" : "Mark complete"}
                </Button>
              </div>
            </Card>
          )}

          {/* Quiz */}
          {quizMode && !result && (
            <Card className="border-brand-200">
              <h2 className="text-xl font-bold">Competency assessment</h2>
              <p className="mt-1 text-sm text-slate-600">Answer all questions. You need {PASS_MARK}% or more to pass.</p>
              <ol className="mt-5 space-y-6">
                {course.quiz.map((q, qi) => (
                  <li key={qi}>
                    <p className="font-semibold">{qi + 1}. {q.q}</p>
                    <div className="mt-2 grid gap-2">
                      {q.options.map((o, oi) => (
                        <label key={oi} className={cx("flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm", answers[qi] === oi ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50")}>
                          <input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((a) => { const n = [...a]; n[qi] = oi; return n; })} />
                          {o}
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
              {quizError && <div className="mt-4"><Alert kind="error">{quizError}</Alert></div>}
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setQuizMode(false)}>Cancel</Button>
                <Button disabled={busy || course.quiz.some((_, i) => answers[i] === undefined)} onClick={submit}>{busy ? "Grading…" : "Submit answers"}</Button>
              </div>
            </Card>
          )}

          {result && (
            <Card className={result.passed ? "border-brand-300 bg-brand-50" : "border-sun-400 bg-sun-100"}>
              {result.passed ? (
                <div className="text-center">
                  <PartyPopper className="mx-auto text-brand-600" size={40} />
                  <h2 className="mt-2 text-2xl font-bold">You passed with {result.score}%!</h2>
                  <p className="mt-1 text-slate-700">Your digital certificate has been issued and signed. You can now apply for {course.domain} jobs.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <LinkButton href={`/verify/${result.certId}`}><Award size={18} /> View certificate</LinkButton>
                    <LinkButton href="/jobs" variant="secondary">Find {course.domain} jobs</LinkButton>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="text-2xl font-bold">You scored {result.score}%</h2>
                  <p className="mt-1 text-slate-700">You need {PASS_MARK}% to pass. Review the lessons and try again - you can retake the quiz anytime.</p>
                  <Button className="mt-4" onClick={() => { setResult(null); setAnswers([]); }}><RotateCcw size={16} /> Retake quiz</Button>
                </div>
              )}
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={() => { setResult(null); setQuizMode(false); setAnswers([]); }}>Back to course</Button>
              </div>
            </Card>
          )}

          {/* Lessons list */}
          {!lesson && !quizMode && (
            <Card>
              <h2 className="mb-3 font-bold">Lessons</h2>
              <ul className="divide-y divide-slate-100">
                {course.lessons.map((l, i) => {
                  const isDone = done.includes(l.id);
                  return (
                    <li key={l.id}>
                      <button disabled={!enrollment} onClick={() => setLessonIdx(i)} className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60">
                        {isDone ? <CheckCircle2 className="shrink-0 text-brand-600" size={20} /> : <Circle className="shrink-0 text-slate-300" size={20} />}
                        <span className="flex-1">
                          <span className="block font-medium">{i + 1}. {l.title}</span>
                          <span className="text-xs text-slate-500">{l.minutes} min read</span>
                        </span>
                        {enrollment && <span className="text-sm font-semibold text-brand-700">{isDone ? "Review" : "Start"}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {enrollment && (
                <div className="mt-4 rounded-lg bg-slate-50 p-4">
                  {allDone ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium">{cert ? `Certified - best score ${enrollment.bestScore}%` : "All lessons complete. Ready for the assessment?"}</p>
                      <Button onClick={() => { setQuizMode(true); setAnswers([]); }} variant={cert ? "secondary" : "primary"}>{cert ? "Retake quiz" : t("takeQuiz")}</Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">Complete all lessons to unlock the quiz.</p>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {enrollment && (
            <Card>
              <h2 className="font-bold">Your progress</h2>
              <div className="mt-3 mb-1 flex justify-between text-sm"><span>{done.length}/{course.lessons.length} lessons</span><span>{pct}%</span></div>
              <Progress value={pct} />
              {enrollment.bestScore !== null && <p className="mt-3 text-sm">Best quiz score: <strong>{enrollment.bestScore}%</strong> ({enrollment.attempts} attempt{enrollment.attempts !== 1 && "s"})</p>}
              {cert && (
                <Link href={`/verify/${cert.id}`} className="mt-4 flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-sm font-semibold text-brand-800 hover:bg-brand-100">
                  <Award size={18} /> View your certificate
                </Link>
              )}
            </Card>
          )}
          {enrollment && course.offlineAvail && (
            <Card>
              <h2 className="font-bold">Offline access</h2>
              <p className="mt-1 text-sm text-slate-600">Download this course ({course.sizeKb} KB) to study without internet. Progress syncs when you reconnect.</p>
              <Button variant={enrollment.downloaded ? "secondary" : "primary"} className="mt-3 w-full" onClick={() => toggleDownload(course.id)}>
                {enrollment.downloaded ? <><Trash2 size={16} /> Remove download</> : <><Download size={16} /> Download for offline</>}
              </Button>
              {enrollment.downloaded && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-700"><CheckCircle2 size={14} /> Available offline on this device</p>}
            </Card>
          )}
          <Card className="bg-gradient-to-br from-brand-700 to-brand-600 text-white">
            <Sparkles className="text-sun-400" />
            <p className="mt-2 font-bold">Jobs need this skill</p>
            <p className="mt-1 text-sm text-brand-50">{db.jobs.filter((j) => j.domain === course.domain && j.status === "open" && !j.flagged).length} open {course.domain} jobs right now.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
