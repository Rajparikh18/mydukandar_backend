-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMode" "PaymentMethod" NOT NULL DEFAULT 'CASH';
