"use client";

import { useEffect, useState } from "react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import { UserProvider } from "./UserContext";
import FeedbackLink from "./FeedbackLink";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createPagesBrowserClient();

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

  return (
    <div className="min-h-screen bg-base-200">
      <UserProvider user={user} loading={loading}>
        {children}
        <FeedbackLink />
      </UserProvider>
    </div>
  );
}
