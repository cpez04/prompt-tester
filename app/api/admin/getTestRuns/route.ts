// app/api/admin/getTestRuns/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

export async function GET(request: Request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const testRuns = await prisma.testRun.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        personasOnRun: {
          include: {
            persona: true,
            messages: true,
          },
        },
        chatbotThreads: {
          include: {
            messages: true,
          },
        },
      },
    });

    const totalCount = await prisma.testRun.count();

    return NextResponse.json({ testRuns, totalCount });
  } catch (error) {
    console.error("Error fetching test runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch test runs" },
      { status: 500 },
    );
  }
}
