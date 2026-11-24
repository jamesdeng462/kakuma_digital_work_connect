// Tiny router: maps "METHOD /path/:param" to handler functions.
// Every route is listed in one place (see ROUTES at the bottom) - this doubles as the API reference.
import { eq } from "drizzle-orm";
import { getDb, type DB } from "./db";
import * as s from "./db/schema";
import { readSession } from "./auth";
import { ApiError, forbidden, json, unauthorized } from "./http";
import type { UserRow } from "./helpers";
import type { Role } from "@/lib/types";

export interface Ctx {
  req: Request;
  db: DB;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  user: UserRow | null;
  /** Returns the logged-in user or throws 401/403 (role-based access control). */
  requireUser: (roles?: Role[]) => UserRow;
}

export type Handler = (ctx: Ctx) => Promise<unknown>;
type Method = "GET" | "POST" | "PATCH" | "DELETE";
interface Route {
  method: Method;
  pattern: string;
  regex: RegExp;
  keys: string[];
  handler: Handler;
  description: string;
}

const routes: Route[] = [];

export function route(method: Method, pattern: string, handler: Handler, description = "") {
  const keys: string[] = [];
  const regex = new RegExp(
    "^" + pattern.replace(/\/:([a-zA-Z]+)/g, (_m, k) => {
      keys.push(k);
      return "/([^/]+)";
    }) + "/?$"
  );
  // Replace on re-registration (dev hot reload) instead of duplicating.
  const existing = routes.findIndex((r) => r.method === method && r.pattern === pattern);
  const entry = { method, pattern, regex, keys, handler, description };
  if (existing >= 0) routes[existing] = entry;
  else routes.push(entry);
}

export function listRoutes() {
  return routes.map((r) => ({ method: r.method, path: "/api" + r.pattern, description: r.description }));
}

export async function dispatch(req: Request, path: string): Promise<Response> {
  const method = req.method as Method;
  const url = new URL(req.url);
  try {
    let matchedPath = false;
    for (const r of routes) {
      const m = path.match(r.regex);
      if (!m) continue;
      matchedPath = true;
      if (r.method !== method) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));

      const db = await getDb();
      const userId = await readSession(req);
      let user: UserRow | null = null;
      if (userId) [user] = await db.select().from(s.users).where(eq(s.users.id, userId));
      user = user ?? null;

      let body: unknown = undefined;
      if (method !== "GET" && method !== "DELETE") {
        const text = await req.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            throw new ApiError(400, "Request body must be valid JSON.");
          }
        }
      }

      const ctx: Ctx = {
        req,
        db,
        params,
        query: url.searchParams,
        body: body ?? {},
        user,
        requireUser: (roles) => {
          if (!user) throw unauthorized();
          if (roles && !roles.includes(user.role)) throw forbidden();
          return user;
        },
      };
      const result = await r.handler(ctx);
      if (result instanceof Response) return result;
      return json(result ?? { ok: true });
    }
    if (matchedPath) return json({ error: "Method not allowed." }, { status: 405 });
    return json({ error: `No API route for ${method} /api${path}` }, { status: 404 });
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, { status: e.status });
    console.error("[api] unhandled error", e);
    return json({ error: "Something went wrong on the server. Please try again." }, { status: 500 });
  }
}
