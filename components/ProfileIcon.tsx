"use client";

import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

interface ProfileIconProps {
  user: User | null;
  loading: boolean;
}

export default function ProfileIcon({ user, loading }: ProfileIconProps) {
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const getInitials = () => {
    const initials =
      (user?.user_metadata?.firstName?.[0] ?? "") +
      (user?.user_metadata?.lastName?.[0] ?? "");
    return initials.toUpperCase();
  };

  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false;

  return (
    <div className="absolute top-4 right-4">
      {loading ? (
        <div className="skeleton w-24 h-8 rounded"></div>
      ) : user ? (
        <div className="dropdown dropdown-end">
          <label
            tabIndex={0}
            className="btn btn-circle btn-primary text-base-100 font-bold"
          >
            {getInitials()}
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40"
          >
            <li>
              <button onClick={() => router.push("/dashboard")}>
                View Your Runs
              </button>
            </li>
            {isAdmin && (
              <li>
                <button onClick={() => router.push("/admin")}>
                  Admin Dashboard
                </button>
              </li>
            )}
            <li>
              <button onClick={handleLogout}>Logout</button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
