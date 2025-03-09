"use client";

import { createContext, useState, useContext, ReactNode } from "react";
import { StoredData, StoredDataContextType } from "@/types";

const StoredDataContext = createContext<StoredDataContextType | undefined>(
  undefined,
);

export function StoredDataProvider({ children }: { children: ReactNode }) {
  const [storedData, setStoredData] = useState<StoredData | null>(null);

  return (
    <StoredDataContext.Provider value={{ storedData, setStoredData }}>
      {children}
    </StoredDataContext.Provider>
  );
}

// Custom Hook to use StoredData
export function useStoredData() {
  const context = useContext(StoredDataContext);
  if (!context) {
    throw new Error("useStoredData must be used within a StoredDataProvider");
  }
  return context;
}
