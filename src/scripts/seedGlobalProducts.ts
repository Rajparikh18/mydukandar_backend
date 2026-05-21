import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { ProductCategory } from '../generated/prisma/enums';

const globalProducts = [
  { name: 'Toor Dal', defaultPrice: 120, defaultMrp: 150, defaultUnit: '1 kg', defaultCategory: ProductCategory.GROCERY, defaultQuantity: 10 },
  { name: 'Soap', defaultPrice: 40, defaultMrp: 45, defaultUnit: '1 piece', defaultCategory: ProductCategory.HOUSEHOLD, defaultQuantity: 20 },
  { name: 'Wheat', defaultPrice: 45, defaultMrp: 55, defaultUnit: '1 kg', defaultCategory: ProductCategory.GROCERY, defaultQuantity: 50 },
  { name: 'Books', defaultPrice: 50, defaultMrp: 60, defaultUnit: '1 piece', defaultCategory: ProductCategory.STATIONERY, defaultQuantity: 30 },
  { name: 'Tooth Paste', defaultPrice: 80, defaultMrp: 95, defaultUnit: '1 piece', defaultCategory: ProductCategory.HOUSEHOLD, defaultQuantity: 15 },
  { name: 'Rice', defaultPrice: 60, defaultMrp: 80, defaultUnit: '1 kg', defaultCategory: ProductCategory.GROCERY, defaultQuantity: 40 },
  { name: 'Sugar', defaultPrice: 42, defaultMrp: 50, defaultUnit: '1 kg', defaultCategory: ProductCategory.GROCERY, defaultQuantity: 30 },
  { name: 'Milk', defaultPrice: 65, defaultMrp: 65, defaultUnit: '1 L', defaultCategory: ProductCategory.GROCERY, defaultQuantity: 20 },
  { name: 'Bread', defaultPrice: 40, defaultMrp: 45, defaultUnit: '1 packet', defaultCategory: ProductCategory.GROCERY, defaultQuantity: 15 },
  { name: 'Pen', defaultPrice: 10, defaultMrp: 15, defaultUnit: '1 piece', defaultCategory: ProductCategory.STATIONERY, defaultQuantity: 100 },
  { name: 'Notebook', defaultPrice: 45, defaultMrp: 60, defaultUnit: '1 piece', defaultCategory: ProductCategory.STATIONERY, defaultQuantity: 50 },
  { name: 'Paracetamol', defaultPrice: 30, defaultMrp: 35, defaultUnit: '1 strip', defaultCategory: ProductCategory.MEDICAL, defaultQuantity: 25 },
];

async function main() {
  console.log('Seeding GlobalProducts...');
  for (const product of globalProducts) {
    await prisma.globalProduct.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    });
  }
  console.log('GlobalProducts seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
