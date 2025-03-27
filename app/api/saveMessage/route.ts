// app/api/saveMessage/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { role, content, personaOnRunId, chatbotThreadId } = await req.json();

    if (
      !content ||
      !role ||
      (role === "persona" && !personaOnRunId) ||
      (role === "assistant" && !chatbotThreadId)
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const message = await prisma.message.create({
      data: {
        role,
        content,
        personaOnRunId: role === "persona" ? personaOnRunId : undefined,
        chatbotThreadId: role === "assistant" ? chatbotThreadId : undefined,
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: unknown) {
    console.error("❌ Failed to save message:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
