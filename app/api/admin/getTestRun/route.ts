import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testRunId = searchParams.get("testRunId");

    if (!testRunId) {
      return NextResponse.json(
        { error: "Test run ID is required" },
        { status: 400 },
      );
    }

    // Get the test run with just the essential data
    const testRun = await prisma.testRun.findUnique({
      where: { id: testRunId },
      select: {
        id: true,
        prompt: true,
        updatedSystemPrompt: true,
        explanation: true,
        createdAt: true,
        assistantName: true,
        personasOnRun: {
          select: {
            id: true,
            personaId: true,
            threadId: true,
            feedback: true,
            liked: true,
            messages: true,
            persona: {
              select: {
                id: true,
                name: true,
                description: true,
                defaultPrompt: true,
                initialQuestion: true,
              },
            },
          },
        },
        chatbotThreads: {
          select: {
            id: true,
            personaName: true,
            threadId: true,
            messages: true,
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

    return NextResponse.json(testRun);
  } catch (error) {
    console.error("Error in getTestRun:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
