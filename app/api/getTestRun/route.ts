import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const testRunId = searchParams.get("testRunId");

  if (!testRunId) {
    return NextResponse.json({ error: "Missing testRunId" }, { status: 400 });
  }

  try {
    // Get the authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Check if the authenticated user owns this test run
    if (testRun.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const response = {
      id: testRun.id,
      prompt: testRun.prompt,
      model: testRun.model,
      assistantId: testRun.assistantId,
      assistantName: testRun.assistantName,
      personaContext: testRun.personaContext,
      messagesPerSide: testRun.messagesPerSide,
      files: testRun.files,
      updatedSystemPrompt: testRun.updatedSystemPrompt,
      explanation: testRun.explanation,
      createdAt: testRun.createdAt,
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
