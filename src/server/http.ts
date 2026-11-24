import { z } from "zod";

/** Error with an HTTP status - thrown by handlers, turned into JSON by the router. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest = (m: string) => new ApiError(400, m);
export const unauthorized = (m = "Please log in.") => new ApiError(401, m);
export const forbidden = (m = "You do not have permission to do this.") => new ApiError(403, m);
export const notFound = (m = "Not found.") => new ApiError(404, m);
export const conflict = (m: string) => new ApiError(409, m);

/** Validates a request body against a zod schema; returns a friendly 400 on failure. */
export function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const r = schema.safeParse(body);
  if (!r.success) {
    const issue = r.error.issues[0];
    const field = issue.path.join(".");
    throw badRequest(field ? `${field}: ${issue.message}` : issue.message);
  }
  return r.data;
}

export function json(data: unknown, init: ResponseInit & { cookies?: string[] } = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  for (const c of init.cookies ?? []) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
