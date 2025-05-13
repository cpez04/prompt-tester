import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Use a transaction to ensure all deletions succeed or none do
    await prisma.$transaction(async (tx) => {
      // Step 1: Delete all messages
      await tx.message.deleteMany({
        where: {
          OR: [
            { personaOnRun: { testRun: { userId } } },
            { chatbotThread: { testRun: { userId } } },
          ],
        },
      });

      // Step 2: Delete all PersonaOnRun
      await tx.personaOnRun.deleteMany({
        where: { testRun: { userId } },
      });

      // Step 3: Delete all ChatbotThreads
      await tx.chatbotThread.deleteMany({
        where: { testRun: { userId } },
      });

      // Step 4: Delete all TestRuns
      await tx.testRun.deleteMany({
        where: { userId },
      });

      // Step 5: Delete UserLimit row if it exists
      await tx.userLimit.deleteMany({
        where: { userId },
      });

      // You could log these counts if desired for debugging or admin panel metrics
    });

    // After DB cleanup, delete the user from Supabase Auth
    const { error: deleteUserError } =
      await supabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Error deleting user from Supabase Auth:", deleteUserError);

      // You may choose to notify admin here, since this is harder to rollback
      return NextResponse.json(
        {
          error:
            "User data deleted but failed to delete user from Supabase Auth",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in deleteUser route:", error);

    return NextResponse.json(
      { error: "Internal server error. User was not deleted." },
      { status: 500 },
    );
  }
}
