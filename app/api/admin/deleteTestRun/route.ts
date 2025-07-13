import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

export async function DELETE(request: Request) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !ADMIN_EMAILS.includes(user.email ?? "")) {
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
