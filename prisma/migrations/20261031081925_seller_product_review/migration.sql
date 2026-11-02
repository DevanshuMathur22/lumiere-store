-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;
