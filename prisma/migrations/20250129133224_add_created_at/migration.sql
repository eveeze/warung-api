-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetOtpCreatedAt" TIMESTAMP(3),
ADD COLUMN     "verificationOtpCreatedAt" TIMESTAMP(3);
