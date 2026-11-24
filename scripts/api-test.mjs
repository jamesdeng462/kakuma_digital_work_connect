// API test suite: business rules (BR1, BR2, 5% fee) and role-based access control.
// Usage: start the app (npm run dev), then in another terminal: npm run test:api
// Optional: BASE_URL=https://your-app.vercel.app npm run test:api
const BASE = (process.env.BASE_URL ?? "http://localhost:3000") + "/api";
const results = [];

function client() {
  return { cookie: null };
}
async function call(c, method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (c.cookie) headers.Cookie = c.cookie;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const set = res.headers.get("set-cookie");
  if (set) c.cookie = set.split(";")[0];
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return [res.status, data];
}
async function login(email, password = "Demo1234!") {
  const c = client();
  const [st] = await call(c, "POST", "/auth/login", { email, password });
  if (st !== 200) throw new Error(`Login failed for ${email} (${st})`);
  return c;
}
function check(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? "✔ PASS" : "✘ FAIL"}  ${name}${ok ? "" : "  → " + JSON.stringify(detail)}`);
}

const anon = client();
let [st, b] = await call(anon, "GET", "/health");
check("health check responds", st === 200 && b.status === "ok", b);
[st] = await call(anon, "GET", "/contracts");
check("anonymous user cannot list contracts (401)", st === 401);
[st] = await call(anon, "POST", "/auth/login", { email: "worker@kdwc.demo", password: "wrong" });
check("wrong password rejected (401)", st === 401);
[st] = await call(anon, "POST", "/reports", { category: "Harassment", description: "Automated test of the anonymous channel." });
check("anonymous safeguarding report accepted", st === 200);
[st] = await call(anon, "POST", "/auth/signup", { name: "Test User", email: `t${Date.now()}@x.com`, phone: "+254700000000", password: "Password1", role: "worker", verification: { method: "unhcr", unhcrId: "FAKE-1" } });
check("signup with an invalid UNHCR number rejected (400)", st === 400);
[st] = await call(anon, "POST", "/auth/signup", { name: "Test User", email: `t${Date.now()}@x.com`, phone: "+254700000000", password: "Password1", role: "admin", verification: { method: "otp", code: "123456" } });
check("cannot self-register as admin (400)", st === 400);

const esther = await login("esther@kdwc.demo");
[st, b] = await call(esther, "POST", "/jobs/j1/apply", { coverLetter: "Please consider my application." });
check("BR1: worker without a certificate cannot apply (403)", st === 403 && /BR1/.test(b.error), b);
[st] = await call(esther, "POST", "/courses/c-customer-service/quiz", { answers: [1, 1, 1] });
check("quiz locked until all lessons are complete (400)", st === 400);
[st] = await call(esther, "GET", "/admin/users");
check("worker cannot use admin API (403)", st === 403);
[st] = await call(esther, "GET", "/contracts/ct-active");
check("worker cannot read someone else's contract (403)", st === 403);
[st, b] = await call(esther, "GET", "/sync");
const text = JSON.stringify(b);
check("sync hides other users' emails", b.db.users.every((u) => u.id === b.userId || u.email === ""));
check("sync never exposes quiz answers", b.db.courses.every((c) => c.quiz.every((q) => q.answer === -1)));
check("sync never exposes password hashes", !/passwordHash|password_hash|\$2[aby]\$/.test(text));

const newEmp = client();
[st] = await call(newEmp, "POST", "/auth/signup", { name: "New Employer", email: `boss${Date.now()}@co.com`, phone: "+254700111222", password: "Password1", role: "employer", companyName: "TestCo", companyRegNo: "REG-1", antiExploitationAgreed: true, paymentCapabilityConfirmed: true, verification: { method: "email", code: "123456" } });
check("employer signup succeeds (201)", st === 201);
[st, b] = await call(newEmp, "POST", "/jobs", { title: "Test job title", domain: "Data Entry", description: "A description that is long enough.", compensation: 50, timeCommitment: "Part-time", experience: "Entry", language: "English" });
check("BR2: unverified employer cannot post jobs (403)", st === 403 && /BR2/.test(b.error), b);

const worker = await login("worker@kdwc.demo");
[st] = await call(worker, "POST", "/contracts/ct-active/pay");
check("worker cannot pay a contract (403)", st === 403);
[st] = await call(worker, "POST", "/wallet/withdraw", { amount: 999999, method: "M-Pesa", account: "+254712000001" });
check("cannot withdraw more than the balance (400)", st === 400);
[st, b] = await call(worker, "POST", "/courses/c-data-entry/quiz", { answers: [1, 1, 1, 2, 0] });
check("quiz graded on the server (100%)", st === 200 && b.score === 100, b);

const employer = await login("employer@kdwc.demo");
[st] = await call(employer, "POST", "/contracts/ct-active/pay");
check("cannot pay before work is approved (400)", st === 400);
[st] = await call(employer, "POST", "/policies", { title: "Employer policy", description: "Employers should not be able to propose." });
check("only youth governors can propose policies (403)", st === 403);
[st, b] = await call(employer, "POST", "/jobs", { title: "x", domain: "Hacking", description: "short", compensation: -5, timeCommitment: "Part-time", experience: "Entry", language: "English" });
check("invalid input rejected with a clear message (400)", st === 400 && typeof b.error === "string", b);

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
