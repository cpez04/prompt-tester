import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/adminEmails";

export async function GET(request: Request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // Check for specific user
      const userLimit = await prisma.userLimit.findUnique({
        where: { userId },
      });

      return NextResponse.json({ userLimit });
    }

    // Get all user limits
    const userLimits = await prisma.userLimit.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ userLimits });
  } catch (error) {
    console.error("Error fetching user limits:", error);
    return NextResponse.json(
      { error: "Failed to fetch user limits" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, maxRuns } = await request.json();

    if (!userId || typeof maxRuns !== "number" || maxRuns < 1) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 },
      );
    }

    const userLimit = await prisma.userLimit.upsert({
      where: { userId },
      update: { maxRuns },
      create: { userId, maxRuns },
    });

    return NextResponse.json({ userLimit });
  } catch (error) {
    console.error("Error updating user limit:", error);
    return NextResponse.json(
      { error: "Failed to update user limit" },
      { status: 500 },
    );
  }
}
