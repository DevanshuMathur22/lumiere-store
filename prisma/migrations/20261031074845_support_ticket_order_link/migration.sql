-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE INDEX "SupportTicket_userId_orderId_idx" ON "SupportTicket"("userId", "orderId");
