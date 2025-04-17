/*
  Warnings:

  - You are about to drop the `Persona` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PersonaOnRun" DROP CONSTRAINT "PersonaOnRun_personaId_fkey";

-- AlterTable
ALTER TABLE "TestRun" ADD COLUMN     "personasJson" JSONB;

-- DropTable
DROP TABLE "Persona";
