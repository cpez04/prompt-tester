import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // Step-by-step deletes to maintain referential integrity:
    const testRuns = await prisma.testRun.findMany({
      where: { userId },
      select: { id: true },
    });

    const testRunIds = testRuns.map((tr) => tr.id);

    // Delete Messages
    await prisma.message.deleteMany({
      where: {
        OR: [
          { personaOnRun: { testRunId: { in: testRunIds } } },
          { chatbotThread: { testRunId: { in: testRunIds } } },
        ],
      },
    });

    // Delete PersonaOnRun and ChatbotThread entries
    await prisma.personaOnRun.deleteMany({
      where: { testRunId: { in: testRunIds } },
    });

    await prisma.chatbotThread.deleteMany({
      where: { testRunId: { in: testRunIds } },
    });

    // Delete TestRuns
    await prisma.testRun.deleteMany({
      where: { userId },
    });

    // Delete UserLimit
    await prisma.userLimit.deleteMany({
      where: { userId },
    });

    return NextResponse.json(
      { message: "User data deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting user data:", error);
    return NextResponse.json(
      { error: "Failed to delete user data" },
      { status: 500 },
    );
  }
}
