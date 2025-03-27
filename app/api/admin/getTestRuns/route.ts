// app/api/admin/getTestRuns/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

export async function GET() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const testRuns = await prisma.testRun.findMany({
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ testRuns });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch test runs" },
      { status: 500 },
    );
  }
}
