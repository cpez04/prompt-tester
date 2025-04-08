import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const testRunId = searchParams.get("testRunId");

  if (!testRunId) {
    return NextResponse.json({ error: "Missing testRunId" }, { status: 400 });
  }

  try {
    const testRun = await prisma.testRun.findUnique({
      where: { id: testRunId },
      include: {
        personasOnRun: {
          include: {
            persona: true,
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
        chatbotThreads: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!testRun) {
      return NextResponse.json(
        { error: "Test run not found" },
        { status: 404 },
      );
    }

    const response = {
      id: testRun.id,
      prompt: testRun.prompt,
      model: testRun.model,
      assistantId: testRun.assistantId,
      assistantName: testRun.assistantName,
      personaContext: testRun.personaContext,
      files: testRun.files,
      updatedSystemPrompt: testRun.updatedSystemPrompt,
      explanation: testRun.explanation,
      personasOnRun: testRun.personasOnRun.map((por) => ({
        persona: por.persona,
        threadId: por.threadId,
        personaOnRunId: por.id,
        messages: por.messages,
      })),
      chatbotThreads: testRun.chatbotThreads.map((ct) => ({
        personaName: ct.personaName,
        threadId: ct.threadId,
        chatbotThreadId: ct.id,
        messages: ct.messages,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[getTestRun] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
