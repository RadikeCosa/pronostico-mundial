import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";
import { formatParticipantName } from "../presentation";

export const SESSION_COOKIE_NAME = "pronosticos_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthParticipant = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  isAdmin: boolean;
};

type SessionPayload = {
  participantId: string;
  exp: number;
};

type ParticipantDelegate = {
  findUnique: PrismaClient["participant"]["findUnique"];
};

type AuthPrismaClient = {
  participant: ParticipantDelegate;
};

type CurrentParticipantOptions = {
  cookieValue?: string | null;
  now?: Date;
  prismaClient?: AuthPrismaClient;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return "development-session-secret-change-me";
}

function signPayload(encodedPayload: string, secret = getSessionSecret()): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createSessionToken(
  participantId: string,
  now: Date = new Date(),
): string {
  const payload: SessionPayload = {
    participantId,
    exp: now.getTime() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string | null | undefined,
  now: Date = new Date(),
): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const actual = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");

  if (actual.byteLength !== expected.byteLength || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<SessionPayload>;
    if (typeof payload.participantId !== "string" || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= now.getTime()) {
      return null;
    }

    return {
      participantId: payload.participantId,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function getCurrentParticipant(
  options: CurrentParticipantOptions = {},
): Promise<AuthParticipant | null> {
  const cookieValue =
    options.cookieValue === undefined
      ? (await cookies()).get(SESSION_COOKIE_NAME)?.value
      : options.cookieValue;
  const payload = verifySessionToken(cookieValue, options.now);

  if (!payload) {
    return null;
  }

  const prisma = options.prismaClient ?? getPrismaClient();
  const participant = await prisma.participant.findUnique({
    where: { id: payload.participantId },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      isAdmin: true,
    },
  });

  if (!participant?.active) {
    return null;
  }

  return {
    ...participant,
    name: formatParticipantName(participant.name),
  };
}

export async function requireParticipant(
  options: CurrentParticipantOptions = {},
): Promise<AuthParticipant> {
  const participant = await getCurrentParticipant(options);

  if (!participant) {
    redirect("/login");
  }

  return participant;
}

export async function requireAdmin(
  options: CurrentParticipantOptions = {},
): Promise<AuthParticipant> {
  const participant = await requireParticipant(options);

  if (!participant.isAdmin) {
    redirect(`/p/${participant.id}`);
  }

  return participant;
}

export async function setSessionCookie(participantId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(participantId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}
