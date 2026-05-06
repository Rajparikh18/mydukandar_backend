-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('SELF_PICKUP', 'DELIVERY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'SELF_PICKUP';
