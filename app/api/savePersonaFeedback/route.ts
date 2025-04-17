import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { feedback } = await req.json();

    if (!Array.isArray(feedback)) {
      return NextResponse.json(
        {
          success: false,
          error: "Payload must include an array of feedback entries",
        },
        { status: 400 },
      );
    }

    const results = [];
    const errors = [];

    for (const entry of feedback) {
      const { personaOnRunId, liked, feedback: comment } = entry;

      if (!personaOnRunId) {
        errors.push({ error: "Missing personaOnRunId", entry });
        continue;
      }

      try {
        const record = await prisma.personaOnRun.findUnique({
          where: { id: personaOnRunId },
          select: { id: true },
        });

        if (!record) {
          errors.push({ error: "PersonaOnRun not found", personaOnRunId });
          continue;
        }

        const updated = await prisma.personaOnRun.update({
          where: { id: personaOnRunId },
          data: {
            liked: liked ?? null,
            feedback: comment ?? null,
            feedbackAt: new Date(),
          },
        });

        results.push(updated);
      } catch (e) {
        console.error(`Error updating ${personaOnRunId}:`, e);
        errors.push({
          personaOnRunId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: results.length,
      totalEntries: feedback.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error("Feedback update failed:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
