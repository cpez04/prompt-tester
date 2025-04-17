-- AlterTable
ALTER TABLE "PersonaOnRun" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "feedbackAt" TIMESTAMP(3),
ADD COLUMN     "liked" BOOLEAN;

-- AlterTable
ALTER TABLE "TestRun" ADD COLUMN     "updatedSystemPrompt" TEXT;
