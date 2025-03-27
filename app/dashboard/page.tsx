"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { User } from "@supabase/supabase-js";

interface Message {
  id: string;
  role: "persona" | "assistant";
  content: string;
  createdAt: string;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
  initialQuestion?: string;
}

interface PersonaOnRun {
  id: string;
  threadId: string;
  personaId: string;
  persona: Persona;
  messages: Message[];
  feedback?: string | null;
  liked?: boolean | null; // true for liked, false for not liked, null for no rating
}

interface ChatbotThread {
  id: string;
  personaName: string;
  threadId: string;
  messages: Message[];
}

interface TestRun {
  id: string;
  createdAt: string;
  assistantId: string;
  assistantName: string;
  model: string;
  prompt: string;
  updatedSystemPrompt?: string;
  personaContext: string;
  personasOnRun: PersonaOnRun[];
  chatbotThreads: ChatbotThread[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [, setAccessGranted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );

  const router = useRouter();
  const supabase = createPagesBrowserClient();

  useEffect(() => {
    const checkAccess = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        router.push("/login");
        return;
      }

      const userEmail = data.user.email ?? "";
      const isAdmin = ADMIN_EMAILS.includes(userEmail);

      if (!isAdmin) {
        router.push("/");
        return;
      }

      setUser(data.user);
      setAccessGranted(true);
      setLoading(false);
    };

    checkAccess();
  }, [router, supabase]);

  useEffect(() => {
    console.log("User object:", user);
  }, [user]);

  const getInitials = () => {
    const initials =
      (user?.user_metadata?.firstName?.[0] ?? "") +
      (user?.user_metadata?.lastName?.[0] ?? "");
    return initials;
  };

  useEffect(() => {
    const fetchTestRuns = async () => {
      const response = await fetch("/api/admin/getTestRuns");
      const result = await response.json();
      setTestRuns(result.testRuns);
    };
    fetchTestRuns();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const selectedPersona = selectedRun?.personasOnRun.find(
    (p) => p.persona.id === selectedPersonaId,
  );

  const matchingChatbotThread = selectedRun?.chatbotThreads.find(
    (ct) => ct.personaName === selectedPersona?.persona.name,
  );

  const fullConversation = [
    ...(selectedPersona?.messages || []),
    ...(matchingChatbotThread?.messages || []),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const hasFeedback =
    (selectedPersona?.liked !== null && selectedPersona?.liked !== undefined) ||
    !!selectedPersona?.feedback;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/4 bg-base-300 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">Runs</h2>
        {testRuns.map((run) => (
          <div
            key={run.id}
            onClick={() => {
              setSelectedRun(run);
              setSelectedPersonaId(null);
            }}
            className={`cursor-pointer p-2 rounded hover:bg-base-200 ${
              selectedRun?.id === run.id ? "bg-base-100 font-bold" : ""
            }`}
          >
            {run.assistantName} ({new Date(run.createdAt).toLocaleString()})
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-base-200 relative">
        {/* Profile Dropdown */}
        <div className="absolute top-4 right-4">
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
                <button onClick={handleLogout}>Logout</button>
              </li>
            </ul>
          </div>
        </div>

        {selectedRun ? (
          <>
            <h2 className="text-2xl font-bold mb-2">
              {selectedRun.assistantName}
            </h2>
            <p className="text-sm text-base-content mb-4">
              {selectedRun.prompt.slice(0, 200)}...
            </p>

            {/* Persona Tabs */}
            <div className="tabs mb-4">
              {selectedRun.personasOnRun.map((p) => (
                <a
                  key={p.persona.id}
                  className={`tab tab-bordered px-4 py-2 rounded transition-colors duration-150 hover:bg-primary/10 ${
                    selectedPersonaId === p.persona.id
                      ? "tab-active ring ring-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedPersonaId(p.persona.id)}
                >
                  {p.persona.name}
                </a>
              ))}
            </div>

            {selectedPersona && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {/* ✨ Collapsible Feedback Panel — only shown if there's feedback */}
                {hasFeedback && (
                  <div className="bg-base-100 p-4 rounded shadow mb-4">
                    <p className="mb-1">
                      <strong>Rating:</strong>{" "}
                      {selectedPersona.liked === true
                        ? "👍"
                        : selectedPersona.liked === false
                          ? "👎"
                          : "No rating provided"}
                    </p>
                    {selectedPersona.feedback ? (
                      <p>
                        <strong>Comment:</strong> {selectedPersona.feedback}
                      </p>
                    ) : (
                      <p className="italic">No feedback comment provided.</p>
                    )}
                  </div>
                )}

                {fullConversation.map((msg, index) => (
                  <div
                    key={index}
                    className={`chat ${
                      msg.role === "assistant" ? "chat-start" : "chat-end"
                    }`}
                  >
                    <div className="chat-bubble">
                      <strong>
                        {msg.role === "assistant"
                          ? "Chatbot"
                          : selectedPersona.persona.name}
                        :
                      </strong>{" "}
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-base-content mt-10">
            Select a test run from the left panel to begin.
          </p>
        )}
      </div>
    </div>
  );
}
