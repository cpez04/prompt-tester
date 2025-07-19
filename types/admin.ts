export interface Message {
  id: string;
  role: "persona" | "assistant";
  content: string;
  createdAt: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
  initialQuestion?: string;
}

export interface PersonaOnRun {
  id: string;
  threadId?: string;
  personaId: string;
  persona: Persona;
  messages?: Message[];
  feedback?: string | null;
  liked?: boolean | null;
}

export interface ChatbotThread {
  id: string;
  personaName: string;
  threadId: string;
  messages?: Message[];
}

export interface TestRun {
  id: string;
  createdAt: string;
  assistantId: string;
  assistantName: string;
  model: string;
  prompt?: string;
  updatedSystemPrompt?: string;
  personaContext?: string;
  personasOnRun: PersonaOnRun[];
  chatbotThreads?: ChatbotThread[];
  explanation?: string;
  status: "Complete" | "In Progress";
  userId: string;
  user: {
    firstName: string;
    lastName: string;
  } | null;
}

export interface CacheEntry {
  testRuns: TestRun[];
  totalCount: number;
  timestamp: number;
}