import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId || userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const testRuns = await prisma.testRun.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        assistantName: true,
        model: true,
        createdAt: true,
        prompt: true,
        personaContext: true,
        updatedSystemPrompt: true,
        personasOnRun: {
          select: {
            messages: {
              select: {
                id: true,
              },
            },
          },
        },
        chatbotThreads: {
          select: {
            messages: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    // Transform the data to include message counts
    const transformedRuns = testRuns.map(run => ({
      ...run,
      totalMessages: 
        run.personasOnRun.reduce((sum, por) => sum + por.messages.length, 0) +
        run.chatbotThreads.reduce((sum, ct) => sum + ct.messages.length, 0),
    }));

    return NextResponse.json({ testRuns: transformedRuns });
  } catch (error) {
    console.error("Error fetching user test runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch test runs" },
      { status: 500 }
    );
  }
} 