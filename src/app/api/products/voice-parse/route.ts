import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { z } from "zod/v4";

const voiceBatchSchema = z.object({
  transcript: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = voiceBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const transcript = parsed.data.transcript.toLowerCase();

    // Fetch all global products. If the GlobalProduct table doesn't exist in the
    // database (Prisma error P2021), treat as no global products available and
    // continue gracefully so voice parsing doesn't crash the API.
    let globalProducts: { name: string; defaultPrice: number; defaultMrp?: number | null; defaultUnit: string; defaultCategory: string; defaultQuantity: number }[] = [];
    try {
      globalProducts = await prisma.globalProduct.findMany();
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err ? (err as any).code : null;
      if (code === "P2021") {
        console.warn("GlobalProduct table not present; voice-parse will return no matches.");
        globalProducts = [];
      } else {
        throw err;
      }
    }

    const matchedProducts = globalProducts.filter((product) =>
      transcript.includes(product.name.toLowerCase())
    );

    if (matchedProducts.length === 0) {
      return NextResponse.json({ draftProducts: [], message: "No products matched." }, { status: 200 });
    }

    // Return the matched products as drafts
    const draftProducts = matchedProducts.map((match) => ({
      name: match.name,
      price: match.defaultPrice,
      mrp: match.defaultMrp,
      unit: match.defaultUnit,
      category: match.defaultCategory,
      quantity: match.defaultQuantity,
    }));

    return NextResponse.json({ draftProducts }, { status: 200 });
  } catch (error) {
    console.error("Voice batch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
