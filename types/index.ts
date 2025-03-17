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
}

export interface Thread {
  persona: Persona;
  threadId: string;
}

export interface StoredData {
  prompt: string;
  persona_situation: string;
  files: { name: string; id: string }[];
  personas: Persona[];
  assistant?: {
    id: string;
    name: string;
    model: string;
  };
  chatbotThreads?: { persona: string; threadId: string }[];
  threads?: Thread[];
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
