-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Address_one_default_per_user"
ON "Address" ("userId")
WHERE "isDefault" = true;
