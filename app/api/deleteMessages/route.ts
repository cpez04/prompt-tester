import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { personaOnRunId, chatbotThreadId } = await req.json();

    console.log("Deleting messages for:", { personaOnRunId, chatbotThreadId });

    if (!personaOnRunId && !chatbotThreadId) {
      return NextResponse.json(
        { success: false, error: "Missing identifiers" },
        { status: 400 },
      );
    }
    const filters = [];

    if (personaOnRunId) {
      filters.push({ personaOnRunId });
    }
    if (chatbotThreadId) {
      filters.push({ chatbotThreadId });
    }

    const deleteResult = await prisma.message.deleteMany({
      where: {
        OR: filters,
      },
    });

    return NextResponse.json({ success: true, deleted: deleteResult.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("❌ Error deleting messages:", error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
