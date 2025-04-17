/*
  Warnings:

  - Added the required column `userId` to the `TestRun` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TestRun" ADD COLUMN     "userId" TEXT NOT NULL;
