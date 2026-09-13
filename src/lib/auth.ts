import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";
import type { RoleName } from "@/lib/types/enums";

const SESSION_COOKIE = "mr_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured.");
  return secret;
}

export interface SessionPayload {
  userId: string;
  role: RoleName;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: SESSION_TTL_SECONDS });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, jwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Reads and validates the session cookie for the current request (Route
 * Handler / Server Component context). Returns null if unauthenticated,
 * or if the account has since been deactivated (spec section 45
 * soft-delete) -- a live session doesn't survive a mid-session
 * deactivation. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (user?.deactivatedAt) return null;
  return user;
}

export async function setSessionCookie(userId: string, role: RoleName) {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession({ userId, role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Server-side RBAC gate. Never rely solely on hiding a button in the UI --
 * every sensitive route handler must call this (spec section 48). */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(...roles: RoleName[]): Promise<User> {
  const user = await requireUser();
  if (!(roles as string[]).includes(user.role)) throw new ForbiddenError();
  return user;
}
