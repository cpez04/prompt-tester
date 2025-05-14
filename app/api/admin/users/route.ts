import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { MAX_TEST_RUNS } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase credentials" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    // Get paginated users
    const { data, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: limit,
    });

    const users = data.users;

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    // Fetch corresponding UserLimit entries
    const userIds = users.map((user) => user.id);
    const userLimits = await prisma.userLimit.findMany({
      where: { userId: { in: userIds } },
    });

    const limitsMap = Object.fromEntries(
      userLimits.map((limit) => [limit.userId, limit.maxRuns]),
    );

    const usersWithLimits = users.map((user) => ({
      ...user,
      maxRuns: limitsMap[user.id] || MAX_TEST_RUNS,
    }));

    // Get total count from the response metadata
    const totalCount = data.total || 0;

    return NextResponse.json({ 
      users: usersWithLimits,
      totalCount
    });
  } catch (error) {
    console.error("Error in users route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
