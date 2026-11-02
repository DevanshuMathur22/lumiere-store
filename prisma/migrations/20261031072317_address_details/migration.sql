-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "addressType" TEXT NOT NULL DEFAULT 'HOME',
ADD COLUMN     "building" TEXT,
ADD COLUMN     "floor" TEXT;
