/*
  Warnings:

  - You are about to drop the column `personasJson` on the `TestRun` table. All the data in the column will be lost.
  - Added the required column `personaId` to the `PersonaOnRun` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PersonaOnRun" ADD COLUMN     "personaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TestRun" DROP COLUMN "personasJson";

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultPrompt" TEXT NOT NULL,
    "initialQuestion" TEXT,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PersonaOnRun" ADD CONSTRAINT "PersonaOnRun_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
