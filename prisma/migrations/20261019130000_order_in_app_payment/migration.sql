-- In-app (FIB) payment details on an order.
ALTER TABLE "Order" ADD COLUMN "payCode" TEXT,
ADD COLUMN "payQr" TEXT,
ADD COLUMN "payAppLink" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3);
