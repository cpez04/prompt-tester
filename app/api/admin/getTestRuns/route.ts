// app/api/admin/getTestRuns/route.ts
import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { createClient } from "@supabase/supabase-js";

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
  const creatorFilter = searchParams.get("creator") || "";

  try {
    // Create Supabase admin client to fetch user data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First, get all users to build the filter
    const { data: users, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      throw usersError;
    }

    // Create a map of user IDs to user data
    const userMap = Object.fromEntries(
      users.users.map((user) => [user.id, user]),
    );

    // If we have a creator filter, find matching user IDs
    let userIdsToFilter: string[] = [];
    if (creatorFilter) {
      userIdsToFilter = users.users
        .filter((user) => {
          const fullName =
            `${user.user_metadata?.firstName ?? ""} ${user.user_metadata?.lastName ?? ""}`.trim();
          return fullName.toLowerCase().includes(creatorFilter.toLowerCase());
        })
        .map((user) => user.id);
    }

    // Build the where clause for the query
    const whereClause =
      userIdsToFilter.length > 0 ? { userId: { in: userIdsToFilter } } : {};

    const testRuns = await prisma.testRun.findMany({
      where: whereClause,
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

    const totalCount = await prisma.testRun.count({
      where: whereClause,
    });

    // Transform the data to include status and user info
    const transformedRuns = testRuns.map((run) => {
      const user = userMap[run.userId];
      return {
        ...run,
        status: run.updatedSystemPrompt ? "Complete" : "In Progress",
        user: user
          ? {
              firstName: user.user_metadata?.firstName ?? "N/A",
              lastName: user.user_metadata?.lastName ?? "",
            }
          : null,
      };
    });

    return NextResponse.json({ testRuns: transformedRuns, totalCount });
  } catch (error) {
    console.error("Error fetching test runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch test runs" },
      { status: 500 },
    );
  }
}
