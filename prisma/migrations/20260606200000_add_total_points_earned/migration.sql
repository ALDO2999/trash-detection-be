-- Add totalPointsEarned column to User
ALTER TABLE "User" ADD COLUMN "totalPointsEarned" INTEGER NOT NULL DEFAULT 0;
