-- CreateTable
CREATE TABLE "UserLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxRuns" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLimit_userId_key" ON "UserLimit"("userId"); 