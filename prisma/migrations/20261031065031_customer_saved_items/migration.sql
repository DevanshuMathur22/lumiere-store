-- CreateTable
CREATE TABLE "SavedCartItem" (
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedCartItem_pkey" PRIMARY KEY ("userId","variantId")
);

-- CreateTable
CREATE TABLE "SavedWishlistItem" (
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedWishlistItem_pkey" PRIMARY KEY ("userId","slug")
);

-- CreateIndex
CREATE INDEX "SavedCartItem_userId_updatedAt_idx" ON "SavedCartItem"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "SavedCartItem" ADD CONSTRAINT "SavedCartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCartItem" ADD CONSTRAINT "SavedCartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedWishlistItem" ADD CONSTRAINT "SavedWishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
