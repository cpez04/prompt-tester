import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/adminEmails";
import SyllabusAnalyzerClient from "./SyllabusAnalyzerClient";

export default async function SyllabusAnalyzerPage() {
  // Server-side auth check
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Redirect if not logged in
  if (error || !user) {
    redirect("/login");
  }

  // Check admin access on server-side (where env vars are available)
  const userEmail = user.email;
  const hasAdminAccess = isAdminEmail(userEmail);

  // Redirect if not admin
  if (!hasAdminAccess) {
    redirect("/");
  }

  // If we get here, user is authenticated and is an admin
  return <SyllabusAnalyzerClient />;
}
