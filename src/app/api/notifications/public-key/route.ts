import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not configured on server" },
      { status: 503 }
    );
  }

  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Missing VAPID public key configuration" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}
