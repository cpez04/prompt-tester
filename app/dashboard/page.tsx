"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { User } from "@supabase/supabase-js";
import { UserCircle } from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [, setAccessGranted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  useEffect(() => {
    const checkAccess = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        router.push("/login");
        return;
      }

      const userEmail = data.user.email ?? "";
      const isAdmin = ADMIN_EMAILS.includes(userEmail);

      if (!isAdmin) {
        router.push("/");
        return;
      }

      setUser(data.user);
      setAccessGranted(true);
      setLoading(false);
    };

    checkAccess();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-6 relative">
      {/* Top Right Profile Dropdown */}
      <div className="absolute top-4 right-4">
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-circle btn-ghost">
            <UserCircle size={24} />
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40"
          >
            <li>
              <button onClick={handleLogout}>Logout</button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <p className="text-base-content mb-2">
        Welcome <span className="font-semibold">{user?.email}</span> 🎉
      </p>
      <p className="text-base-content">
        You&apos;re logged in and have access to manage test data or view
        messages.
      </p>
    </div>
  );
}
