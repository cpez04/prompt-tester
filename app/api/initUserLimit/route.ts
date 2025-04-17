import { NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { MAX_TEST_RUNS } from "@/lib/constants";

export async function POST() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user limit already exists
    const existingLimit = await prisma.userLimit.findUnique({
      where: { userId: user.id },
    });

    if (existingLimit) {
      return NextResponse.json({ userLimit: existingLimit });
    }

    // Create new user limit with default value
    const userLimit = await prisma.userLimit.create({
      data: {
        userId: user.id,
        maxRuns: MAX_TEST_RUNS,
      },
    });

    return NextResponse.json({ userLimit });
  } catch (error) {
    console.error("Error initializing user limit:", error);
    return NextResponse.json(
      { error: "Failed to initialize user limit" },
      { status: 500 },
    );
  }
}
