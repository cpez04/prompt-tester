import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function DELETE() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    // Delete all user data from your database tables
    // Add your database deletion logic here
    // For example:
    // await supabase.from('user_data').delete().eq('user_id', user.id);
    // await supabase.from('user_settings').delete().eq('user_id', user.id);
    // etc.

    return NextResponse.json(
      { message: "User data deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting user data:", error);
    return NextResponse.json(
      { error: "Failed to delete user data" },
      { status: 500 },
    );
  }
}
