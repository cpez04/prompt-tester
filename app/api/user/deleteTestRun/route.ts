import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function DELETE(request: Request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const testRunId = searchParams.get("testRunId");

    if (!testRunId) {
      return NextResponse.json(
        { error: "Test run ID is required" },
        { status: 400 },
      );
    }

    // First, verify the test run exists and belongs to this user
    const testRun = await prisma.testRun.findUnique({
      where: {
        id: testRunId,
      },
      select: {
        userId: true,
      },
    });

    if (!testRun) {
      return NextResponse.json(
        { error: "Test run not found" },
        { status: 404 },
      );
    }

    if (testRun.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own test runs" },
        { status: 403 },
      );
    }

    // Delete the test run - cascading deletes will handle related records
    await prisma.testRun.delete({
      where: {
        id: testRunId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting test run:", error);
    return NextResponse.json(
      { error: "Failed to delete test run" },
      { status: 500 },
    );
  }
}