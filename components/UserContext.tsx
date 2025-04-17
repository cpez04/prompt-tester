"use client";

import { createContext, useContext, ReactNode } from "react";
import { User } from "@supabase/supabase-js";

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
  user,
  loading,
}: {
  children: ReactNode;
  user: User | null;
  loading: boolean;
}) {
  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
