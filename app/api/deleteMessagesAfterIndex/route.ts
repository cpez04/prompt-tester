import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { personaOnRunId, db_chatbotid, editedCreatedAt } = body;

    if (!personaOnRunId || !db_chatbotid || !editedCreatedAt) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    const editedTimestamp = new Date(editedCreatedAt);

    // Delete persona messages
    await prisma.message.deleteMany({
      where: {
        personaOnRunId,
        role: "persona",
        createdAt: {
          gte: editedTimestamp,
        },
      },
    });

    // Delete assistant messages
    await prisma.message.deleteMany({
      where: {
        chatbotThreadId: db_chatbotid,
        role: "assistant",
        createdAt: {
          gte: editedTimestamp,
        },
      },
    });

    return NextResponse.json({ message: "Messages deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting messages after timestamp:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
