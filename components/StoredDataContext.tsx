"use client";

import { createContext, useState, useContext, ReactNode } from "react";

interface Persona {
  id: string;
  name: string;
  description: string;
}

interface Thread {
  persona: Persona;
  threadId: string;
}

interface StoredData {
  prompt: string;
  files: { name: string; id: string }[];
  personas: Persona[];
  assistant?: {
    id: string;
    name: string;
    description: string;
    model: string;
  };
  chatbotThreads?: { persona: string; threadId: string }[];
  threads?: Thread[];
}

interface StoredDataContextType {
  storedData: StoredData | null;
  setStoredData: (data: StoredData | null) => void;
}

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
