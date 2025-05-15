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
  const limit = parseInt(searchParams.get("limit") || "9");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!userId || userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [testRuns, totalCount] = await Promise.all([
      prisma.testRun.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
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
              id: true,
              persona: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          chatbotThreads: {
            select: {
              id: true,
              personaName: true,
            },
          },
        },
      }),
      prisma.testRun.count({
        where: {
          userId: user.id,
        },
      }),
    ]);

    // Transform the data to include status based on updatedSystemPrompt and expiration
    const transformedRuns = testRuns.map((run) => {
      const createdAt = new Date(run.createdAt);
      const now = new Date();
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      let status: "Complete" | "In Progress" | "Expired";
      if (daysSinceCreation >= 60) {
        status = "Expired";
      } else {
        status = run.updatedSystemPrompt ? "Complete" : "In Progress";
      }

      return {
        ...run,
        status,
      };
    });

    return NextResponse.json({ testRuns: transformedRuns, totalCount });
  } catch (error) {
    console.error("Error fetching user test runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch test runs" },
      { status: 500 },
    );
  }
}
