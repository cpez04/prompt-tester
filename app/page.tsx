"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";

export default function LandingPage() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // ← NEW

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
      }
      setLoading(false); 
    };

    fetchUser();
  }, [supabase]);

  const handleBegin = () => {
    router.push("/playground");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh(); // re-check auth
  };

  const getInitials = () => {
    const initials =
      (user?.user_metadata?.firstName?.[0] ?? "") +
      (user?.user_metadata?.lastName?.[0] ?? "");
    return initials.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-base-200 px-4 relative">
      {/* Top Right Admin/Profile */}
      <div className="absolute top-4 right-4">
        {loading ? (
          <div className="skeleton w-24 h-8 rounded"></div> // Optional loading UI
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
                  Admin Dashboard
                </button>
              </li>
              <li>
                <button onClick={handleLogout}>Logout</button>
              </li>
            </ul>
          </div>
        ) : (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => router.push("/login")}
          >
            Admin Login
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center h-full text-center pt-32">
        <h1 className="text-5xl font-bold mb-4">Prompt Tester</h1>
        <p className="text-lg text-base-content max-w-xl mb-8">
          Upload your prompt, assign personas, and simulate how your assistant
          responds. A playground for building and testing AI behaviors for
          educators.
        </p>
        <button className="btn btn-primary btn-lg" onClick={handleBegin}>
          Click to Begin
        </button>
      </div>
    </div>
  );
}
