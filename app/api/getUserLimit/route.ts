import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { MAX_TEST_RUNS } from "@/lib/constants";

export async function GET(request: Request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userLimit = await prisma.userLimit.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      maxRuns: userLimit?.maxRuns ?? MAX_TEST_RUNS,
    });
  } catch (error) {
    console.error("Error fetching user limit:", error);
    return NextResponse.json(
      { error: "Failed to fetch user limit" },
      { status: 500 },
    );
  }
}
