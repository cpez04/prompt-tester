import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { testRunId, updatedPrompt } = await req.json();

    if (!testRunId || !updatedPrompt) {
      return NextResponse.json(
        { success: false, error: "Missing testRunId or updatedPrompt" },
        { status: 400 },
      );
    }

    const updated = await prisma.testRun.update({
      where: { id: testRunId },
      data: { updatedSystemPrompt: updatedPrompt },
    });

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("Failed to update testRun:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
