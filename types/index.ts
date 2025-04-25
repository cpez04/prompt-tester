export interface Persona {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
  initialQuestion?: string;
}

export interface Message {
  role: "persona" | "assistant";
  content: string;
  isLoading?: boolean;
  createdAt?: string | Date;
}

export interface Thread {
  persona: Persona;
  threadId: string; // OpenAI thread ID
  personaOnRunId?: string; // 🆕 database UUID
}

export interface ChatbotThread {
  persona: string;
  threadId: string; // OpenAI thread ID
  chatbotThreadId?: string; // 🆕 database UUID
}

export interface StoredData {
  prompt: string;
  persona_situation: string;
  files: { name: string; id: string }[];
  personas: Persona[];
  testRunId?: string; // 🆕 database UUID

  assistant?: {
    id: string;
    name: string;
    model: string;
  };
  messages_per_side: number;

  threads?: Thread[]; // Includes personaOnRunId
  chatbotThreads?: ChatbotThread[]; // Includes chatbotThreadId

  responses?: Record<string, Message[]>;
}

export interface StoredDataContextType {
  storedData: StoredData | null;
  setStoredData: (data: StoredData | null) => void;
}

export interface ExportChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  selectedPersonas: string[];
  setSelectedPersonas: React.Dispatch<React.SetStateAction<string[]>>;
  exportChats: () => void;
}
