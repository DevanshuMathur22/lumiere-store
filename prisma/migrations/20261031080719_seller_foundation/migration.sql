-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sellerId" TEXT;

-- CreateTable
CREATE TABLE "SellerAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerAccount_userId_key" ON "SellerAccount"("userId");

-- CreateIndex
CREATE INDEX "SellerAccount_status_createdAt_idx" ON "SellerAccount"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_sellerId_active_idx" ON "Product"("sellerId", "active");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerAccount" ADD CONSTRAINT "SellerAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
