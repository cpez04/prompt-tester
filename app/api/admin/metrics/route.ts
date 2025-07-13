import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/adminEmails";

export async function GET() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get total number of test runs
    const totalRuns = await prisma.testRun.count();

    // Get total number of messages across all test runs
    const testRuns = await prisma.testRun.findMany({
      include: {
        personasOnRun: {
          include: {
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

    let totalMessages = 0;
    testRuns.forEach((run) => {
      // Count messages from personas
      run.personasOnRun.forEach((persona) => {
        totalMessages += persona.messages.length;
      });

      // Count messages from chatbot threads
      run.chatbotThreads.forEach((thread) => {
        totalMessages += thread.messages.length;
      });
    });

    // Calculate average messages per run
    const averageMessagesPerRun = totalRuns > 0 ? totalMessages / totalRuns : 0;

    return NextResponse.json({
      totalMessages,
      totalRuns,
      averageMessagesPerRun,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
