import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// In-memory login attempt tracker (SRS §5.3: Account lockout after 5 failed attempts)
const loginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getAttemptInfo(email: string) {
  return loginAttempts.get(email) || { count: 0, lockedUntil: null };
}

function recordFailedAttempt(email: string) {
  const info = getAttemptInfo(email);
  info.count += 1;
  if (info.count >= MAX_ATTEMPTS) {
    info.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(email, info);
}

function clearAttempts(email: string) {
  loginAttempts.delete(email);
}

function isLocked(email: string): { locked: boolean; remainingMinutes: number } {
  const info = getAttemptInfo(email);
  if (info.lockedUntil && Date.now() < info.lockedUntil) {
    const remainingMinutes = Math.ceil((info.lockedUntil - Date.now()) / 60000);
    return { locked: true, remainingMinutes };
  }
  // If lockout expired, reset
  if (info.lockedUntil && Date.now() >= info.lockedUntil) {
    clearAttempts(email);
  }
  return { locked: false, remainingMinutes: 0 };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Check if account is locked
    const lockStatus = isLocked(email);
    if (lockStatus.locked) {
      return NextResponse.json(
        { error: `Account locked due to too many failed attempts. Try again in ${lockStatus.remainingMinutes} minute(s).` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      recordFailedAttempt(email);
      const info = getAttemptInfo(email);
      const remaining = MAX_ATTEMPTS - info.count;
      return NextResponse.json(
        { error: `Invalid credentials${remaining > 0 ? `. ${remaining} attempt(s) remaining.` : ". Account is now locked for 15 minutes."}` },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      recordFailedAttempt(email);
      const info = getAttemptInfo(email);
      const remaining = MAX_ATTEMPTS - info.count;
      return NextResponse.json(
        { error: `Invalid credentials${remaining > 0 ? `. ${remaining} attempt(s) remaining.` : ". Account is now locked for 15 minutes."}` },
        { status: 401 }
      );
    }

    // Successful login — clear failed attempts
    clearAttempts(email);

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    // If shop owner, include shop info
    let shop = null;
    if (user.role === "SHOP_OWNER") {
      shop = await prisma.shop.findUnique({ where: { ownerId: user.id } });
    }

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
      shop: shop ? { id: shop.id, name: shop.name } : null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
