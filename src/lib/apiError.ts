import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { InvalidTransitionError } from "@/lib/referral/stateMachine";

export class NotFoundError extends Error {
  constructor(message = "Resource not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  details?: unknown;
  constructor(message = "This action conflicts with the current state of the resource.", details?: unknown) {
    super(message);
    this.name = "ConflictError";
    this.details = details;
  }
}

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please slow down.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** Maps a thrown error to a structured JSON response with the correct HTTP
 * status. Never leaks stack traces or internal messages to the client for
 * unexpected errors (spec sections 47-48) -- those are logged server-side
 * only and returned as a generic 500. */
export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "The request data is invalid.", details: error.flatten() } },
      { status: 422 }
    );
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: error.message } }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: error.message } }, { status: 404 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: error.message, details: error.details } },
      { status: 409 }
    );
  }
  if (error instanceof InvalidTransitionError) {
    return NextResponse.json({ error: { code: "CONFLICT", message: error.message } }, { status: 409 });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: error.message } }, { status: 429 });
  }
  // eslint-disable-next-line no-console
  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500 }
  );
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 });
}
