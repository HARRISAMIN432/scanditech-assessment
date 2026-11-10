import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Wraps a route handler so every failure becomes a consistent `{ error: { code, message } }` response. */
export function route<C = unknown>(handler: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
        return json({ error: { code: "VALIDATION_ERROR", message } }, 400);
      }
      if (err instanceof AppError) {
        return json({ error: { code: err.code, message: err.message, details: err.details } }, err.status);
      }
      console.error("[api] unexpected error", err);
      return json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong on the server." } }, 500);
    }
  };
}
