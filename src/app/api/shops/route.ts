import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { z } from "zod/v4";

const createShopSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  address: z.string().min(5),
  city: z.string().min(2),
  pincode: z.string().min(6).max(6),
  phone: z.string().min(10),
});

// GET /api/shops - Search shops by shop name, location, owner name, or product name
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const city = (searchParams.get("city") || "").trim();

    const matchingShopIds = new Set<string>();

    if (search) {
      const directShopMatches = await prisma.shop.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { pincode: { contains: search, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });

      const ownerMatches = await prisma.user.findMany({
        where: {
          name: { contains: search, mode: "insensitive" },
        },
        select: {
          shop: {
            select: { id: true },
          },
        },
      });

      const productMatches = await prisma.product.findMany({
        where: {
          name: { contains: search, mode: "insensitive" },
        },
        select: { shopId: true },
        distinct: ["shopId"],
      });

      directShopMatches.forEach((shop) => matchingShopIds.add(shop.id));
      ownerMatches.forEach((user) => {
        if (user.shop?.id) matchingShopIds.add(user.shop.id);
      });
      productMatches.forEach((product) => matchingShopIds.add(product.shopId));
    }

    const where: Record<string, unknown> = { isActive: true };

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    if (search) {
      where.id = { in: Array.from(matchingShopIds) };
    }

    const shops = await prisma.shop.findMany({
      where,
      include: {
        owner: { select: { name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ shops });
  } catch (error) {
    console.error("Get shops error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/shops - Create a shop (shop owner only)
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth || auth.role !== "SHOP_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingShop = await prisma.shop.findUnique({ where: { ownerId: auth.userId } });
    if (existingShop) {
      return NextResponse.json({ error: "You already have a shop" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = createShopSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.create({
      data: { ...parsed.data, ownerId: auth.userId },
    });

    return NextResponse.json({ shop }, { status: 201 });
  } catch (error) {
    console.error("Create shop error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
