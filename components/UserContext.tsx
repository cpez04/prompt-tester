"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { User } from "@supabase/supabase-js";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

interface UserContextType {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
});

export function UserProvider({
  children,
  user: initialUser,
  loading: initialLoading,
}: {
  children: ReactNode;
  user: User | null;
  loading: boolean;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(initialLoading);
  const supabase = createPagesBrowserClient();

  useEffect(() => {
    const initializeUserLimit = async () => {
      try {
        const response = await fetch("/api/initUserLimit", {
          method: "POST",
        });

        if (!response.ok) {
          console.error("Failed to initialize user limit");
        }
      } catch (error) {
        console.error("Error initializing user limit:", error);
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        initializeUserLimit();
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setLoading(false);
        await initializeUserLimit();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
