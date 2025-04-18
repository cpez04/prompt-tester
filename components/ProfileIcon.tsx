"use client";

import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

import { useState, useRef, useEffect } from "react";

interface ProfileIconProps {
  user: {
    email?: string;
    user_metadata?: {
      firstName?: string;
      lastName?: string;
    };
  } | null;
  loading: boolean;
}

export default function ProfileIcon({ user, loading }: ProfileIconProps) {
  const router = useRouter();
  const supabase = createPagesBrowserClient();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {loading ? (
        <div className="skeleton w-24 h-8 rounded"></div>
      ) : user ? (
        <div className="dropdown dropdown-end">
          <button
            className="btn btn-circle font-bold border border-neutral-content bg-gradient-to-br from-secondary to-accent text-white dark:text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 hover:bg-accent-focus cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {getInitials()}
          </button>
          {open && (
            <ul className="absolute right-0 mt-2 z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
              <li>
                <button
                  onClick={() => {
                    router.push("/dashboard");
                    setOpen(false);
                  }}
                >
                  View Your Runs
                </button>
              </li>
              {isAdmin && (
                <li>
                  <button
                    onClick={() => {
                      router.push("/admin");
                      setOpen(false);
                    }}
                  >
                    Admin Dashboard
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    handleLogout();
                    setOpen(false);
                  }}
                >
                  Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
