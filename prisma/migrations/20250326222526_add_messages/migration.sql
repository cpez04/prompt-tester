-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personaOnRunId" TEXT,
    "chatbotThreadId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_personaOnRunId_fkey" FOREIGN KEY ("personaOnRunId") REFERENCES "PersonaOnRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatbotThreadId_fkey" FOREIGN KEY ("chatbotThreadId") REFERENCES "ChatbotThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
