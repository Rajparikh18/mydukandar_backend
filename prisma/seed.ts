import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customerShopConnection.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 10);

  // ─── Create Shop Owners ───
  const shopOwner1 = await prisma.user.create({
    data: {
      email: "raj@dukandar.com",
      password: hashedPassword,
      name: "Raj Kumar",
      phone: "9876543210",
      role: "SHOP_OWNER",
    },
  });

  const shopOwner2 = await prisma.user.create({
    data: {
      email: "priya@dukandar.com",
      password: hashedPassword,
      name: "Priya Sharma",
      phone: "9876543211",
      role: "SHOP_OWNER",
    },
  });

  const shopOwner3 = await prisma.user.create({
    data: {
      email: "amit@dukandar.com",
      password: hashedPassword,
      name: "Amit Patel",
      phone: "9876543212",
      role: "SHOP_OWNER",
    },
  });

  // ─── Create Customers ───
  const customer1 = await prisma.user.create({
    data: {
      email: "customer@test.com",
      password: hashedPassword,
      name: "Rahul Verma",
      phone: "9988776655",
      role: "CUSTOMER",
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: "customer2@test.com",
      password: hashedPassword,
      name: "Sneha Gupta",
      phone: "9988776656",
      role: "CUSTOMER",
    },
  });

  // ─── Create Shops ───
  const shop1 = await prisma.shop.create({
    data: {
      name: "Raj Kirana Store",
      description: "Your trusted neighborhood grocery store with fresh items daily",
      address: "Shop No. 5, Main Market, Andheri West",
      city: "Mumbai",
      pincode: "400058",
      phone: "9876543210",
      ownerId: shopOwner1.id,
    },
  });

  const shop2 = await prisma.shop.create({
    data: {
      name: "Priya Medical & General Store",
      description: "Medical supplies, toiletries, and daily essentials",
      address: "B-12, Sector 15, Vashi",
      city: "Navi Mumbai",
      pincode: "400703",
      phone: "9876543211",
      ownerId: shopOwner2.id,
    },
  });

  const shop3 = await prisma.shop.create({
    data: {
      name: "Amit Stationery Hub",
      description: "Complete stationery, books, and office supplies",
      address: "14, College Road, Dadar",
      city: "Mumbai",
      pincode: "400014",
      phone: "9876543212",
      ownerId: shopOwner3.id,
    },
  });

  // ─── Products for Shop 1: Raj Kirana Store (Grocery) ───
  const groceryProducts = [
    { name: "Basmati Rice (5kg)", price: 450, mrp: 500, unit: "bag", category: "GROCERY" as const, inStock: true, quantity: 50 },
    { name: "Toor Dal (1kg)", price: 140, mrp: 160, unit: "kg", category: "GROCERY" as const, inStock: true, quantity: 100 },
    { name: "Wheat Flour - Aashirvaad (5kg)", price: 250, mrp: 280, unit: "bag", category: "GROCERY" as const, inStock: true, quantity: 40 },
    { name: "Sugar (1kg)", price: 45, mrp: 50, unit: "kg", category: "GROCERY" as const, inStock: true, quantity: 200 },
    { name: "Mustard Oil (1L)", price: 180, mrp: 200, unit: "bottle", category: "GROCERY" as const, inStock: true, quantity: 30 },
    { name: "Sunflower Oil (1L)", price: 150, mrp: 170, unit: "bottle", category: "GROCERY" as const, inStock: true, quantity: 35 },
    { name: "Salt - Tata (1kg)", price: 25, mrp: 28, unit: "kg", category: "GROCERY" as const, inStock: true, quantity: 100 },
    { name: "Red Chilli Powder (200g)", price: 60, mrp: 70, unit: "packet", category: "GROCERY" as const, inStock: true, quantity: 80 },
    { name: "Turmeric Powder (200g)", price: 45, mrp: 55, unit: "packet", category: "GROCERY" as const, inStock: true, quantity: 80 },
    { name: "Cumin Seeds (100g)", price: 55, mrp: 65, unit: "packet", category: "GROCERY" as const, inStock: true, quantity: 60 },
    { name: "Tea - Tata Gold (500g)", price: 250, mrp: 280, unit: "packet", category: "GROCERY" as const, inStock: true, quantity: 40 },
    { name: "Milk Packet (500ml)", price: 28, mrp: 30, unit: "packet", category: "GROCERY" as const, inStock: true, quantity: 100 },
    { name: "Bread - Britannia (400g)", price: 40, mrp: 45, unit: "packet", category: "GROCERY" as const, inStock: true, quantity: 25 },
    { name: "Maggi Noodles (Pack of 4)", price: 52, mrp: 56, unit: "pack", category: "GROCERY" as const, inStock: true, quantity: 50 },
    { name: "Biscuit - Parle-G (250g)", price: 20, mrp: 22, unit: "packet", category: "GROCERY" as const, inStock: true, quantity: 100 },
  ];

  for (const p of groceryProducts) {
    await prisma.product.create({
      data: { ...p, shopId: shop1.id },
    });
  }

  // ─── Products for Shop 2: Priya Medical & General Store ───
  const medicalProducts = [
    { name: "Dettol Soap (125g)", price: 42, mrp: 48, unit: "piece", category: "MEDICAL" as const, inStock: true, quantity: 100 },
    { name: "Lifebuoy Handwash (200ml)", price: 75, mrp: 85, unit: "bottle", category: "MEDICAL" as const, inStock: true, quantity: 40 },
    { name: "Colgate Toothpaste (200g)", price: 100, mrp: 110, unit: "tube", category: "MEDICAL" as const, inStock: true, quantity: 50 },
    { name: "Crocin Advance (10 tablets)", price: 30, mrp: 35, unit: "strip", category: "MEDICAL" as const, inStock: true, quantity: 200 },
    { name: "Band-Aid (Pack of 10)", price: 35, mrp: 40, unit: "pack", category: "MEDICAL" as const, inStock: true, quantity: 80 },
    { name: "Vicks VapoRub (25ml)", price: 85, mrp: 95, unit: "jar", category: "MEDICAL" as const, inStock: true, quantity: 30 },
    { name: "Dettol Antiseptic (120ml)", price: 55, mrp: 62, unit: "bottle", category: "MEDICAL" as const, inStock: true, quantity: 45 },
    { name: "ORS Sachets (Pack of 5)", price: 25, mrp: 30, unit: "pack", category: "MEDICAL" as const, inStock: true, quantity: 100 },
    { name: "Head & Shoulders Shampoo (200ml)", price: 190, mrp: 210, unit: "bottle", category: "HOUSEHOLD" as const, inStock: true, quantity: 30 },
    { name: "Dove Soap (100g)", price: 52, mrp: 58, unit: "piece", category: "HOUSEHOLD" as const, inStock: true, quantity: 80 },
    { name: "Surf Excel (1kg)", price: 120, mrp: 135, unit: "packet", category: "HOUSEHOLD" as const, inStock: true, quantity: 60 },
    { name: "Vim Dishwash Bar (300g)", price: 30, mrp: 35, unit: "bar", category: "HOUSEHOLD" as const, inStock: true, quantity: 100 },
  ];

  for (const p of medicalProducts) {
    await prisma.product.create({
      data: { ...p, shopId: shop2.id },
    });
  }

  // ─── Products for Shop 3: Amit Stationery Hub ───
  const stationeryProducts = [
    { name: "Classmate Notebook (200 pages)", price: 55, mrp: 60, unit: "piece", category: "STATIONERY" as const, inStock: true, quantity: 200 },
    { name: "Cello Pen (Blue, Pack of 5)", price: 50, mrp: 55, unit: "pack", category: "STATIONERY" as const, inStock: true, quantity: 100 },
    { name: "Reynolds Pen (Black)", price: 12, mrp: 15, unit: "piece", category: "STATIONERY" as const, inStock: true, quantity: 500 },
    { name: "Apsara Pencil (Pack of 10)", price: 40, mrp: 50, unit: "pack", category: "STATIONERY" as const, inStock: true, quantity: 80 },
    { name: "Camlin Geometry Box", price: 120, mrp: 140, unit: "box", category: "STATIONERY" as const, inStock: true, quantity: 30 },
    { name: "A4 Sheets (500 pages)", price: 280, mrp: 320, unit: "ream", category: "STATIONERY" as const, inStock: true, quantity: 25 },
    { name: "Fevicol (100g)", price: 35, mrp: 40, unit: "bottle", category: "STATIONERY" as const, inStock: true, quantity: 60 },
    { name: "Scotch Tape", price: 25, mrp: 30, unit: "roll", category: "STATIONERY" as const, inStock: true, quantity: 80 },
    { name: "Stapler + Pins", price: 80, mrp: 95, unit: "set", category: "STATIONERY" as const, inStock: true, quantity: 40 },
    { name: "Whiteboard Marker (Pack of 4)", price: 90, mrp: 100, unit: "pack", category: "STATIONERY" as const, inStock: true, quantity: 50 },
    { name: "Drawing Book (A3)", price: 45, mrp: 50, unit: "piece", category: "STATIONERY" as const, inStock: true, quantity: 60 },
    { name: "File Folder (Pack of 5)", price: 60, mrp: 70, unit: "pack", category: "STATIONERY" as const, inStock: true, quantity: 40 },
  ];

  for (const p of stationeryProducts) {
    await prisma.product.create({
      data: { ...p, shopId: shop3.id },
    });
  }

  // ─── Connect customers to shops ───
  await prisma.customerShopConnection.create({
    data: { customerId: customer1.id, shopId: shop1.id },
  });
  await prisma.customerShopConnection.create({
    data: { customerId: customer1.id, shopId: shop2.id },
  });
  await prisma.customerShopConnection.create({
    data: { customerId: customer2.id, shopId: shop1.id },
  });
  await prisma.customerShopConnection.create({
    data: { customerId: customer2.id, shopId: shop3.id },
  });

  console.log("✅ Seed complete!");
  console.log("──────────────────────────────────────");
  console.log("Demo Accounts:");
  console.log("  Shop Owner 1: raj@dukandar.com / password123");
  console.log("  Shop Owner 2: priya@dukandar.com / password123");
  console.log("  Shop Owner 3: amit@dukandar.com / password123");
  console.log("  Customer 1:   customer@test.com / password123");
  console.log("  Customer 2:   customer2@test.com / password123");
  console.log("──────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
