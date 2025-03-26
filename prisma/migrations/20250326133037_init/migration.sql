-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assistantId" TEXT NOT NULL,
    "assistantName" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "personaContext" TEXT NOT NULL,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultPrompt" TEXT NOT NULL,
    "initialQuestion" TEXT,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaOnRun" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,

    CONSTRAINT "PersonaOnRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotThread" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "personaName" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,

    CONSTRAINT "ChatbotThread_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PersonaOnRun" ADD CONSTRAINT "PersonaOnRun_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaOnRun" ADD CONSTRAINT "PersonaOnRun_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotThread" ADD CONSTRAINT "ChatbotThread_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
