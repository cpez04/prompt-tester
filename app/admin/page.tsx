"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { User } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL, Diff } from 'diff-match-patch';

function WordDiffViewer({ 
  oldValue, 
  newValue, 
  isEditing = false, 
  onEdit = () => {} 
}: { 
  oldValue: string; 
  newValue: string; 
  isEditing?: boolean;
  onEdit?: (value: string) => void;
}) {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldValue, newValue);
  dmp.diff_cleanupSemantic(diffs);

  return (
    <div className="grid grid-cols-2 gap-4 font-mono text-sm">
      <div className="whitespace-pre-wrap">
        {diffs.map((diff: Diff, i: number) => {
          if (diff[0] === DIFF_DELETE || diff[0] === DIFF_EQUAL) {
            return (
              <span
                key={i}
                className={diff[0] === DIFF_DELETE ? "bg-error/40" : ""}
              >
                {diff[1]}
              </span>
            );
          }
          return null;
        })}
      </div>
      {isEditing ? (
        <textarea
          className="whitespace-pre-wrap font-mono text-sm w-full h-full min-h-[300px] p-2 bg-base-100 border border-base-300 rounded"
          value={newValue}
          onChange={(e) => onEdit(e.target.value)}
        />
      ) : (
        <div className="whitespace-pre-wrap">
          {diffs.map((diff: Diff, i: number) => {
            if (diff[0] === DIFF_INSERT || diff[0] === DIFF_EQUAL) {
              return (
                <span
                  key={i}
                  className={diff[0] === DIFF_INSERT ? "bg-success/40" : ""}
                >
                  {diff[1]}
                </span>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

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
  liked?: boolean | null; 
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
  explanation?: string;
}

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [, setAccessGranted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [showPromptComparison, setShowPromptComparison] = useState(false);
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const testRunItemRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const supabase = createPagesBrowserClient();

  // Calculate page size based on container height
  const calculatePageSize = () => {
    if (sidebarRef.current && testRunItemRef.current) {
      const containerHeight = sidebarRef.current.clientHeight;
      const itemHeight = testRunItemRef.current.clientHeight;
      const padding = 100; // Approximate space for header, pagination, etc.
      const availableHeight = containerHeight - padding;
      
      // Calculate how many items can fit in the available height
      const calculatedPageSize = Math.floor(availableHeight / itemHeight);
      
      // Ensure we have at least 1 item per page
      setPageSize(Math.max(1, calculatedPageSize));
    }
  };

  // Update page size when window resizes
  useEffect(() => {
    calculatePageSize();
    
    const handleResize = () => {
      calculatePageSize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  console.log("test runs:", testRuns);

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
      const response = await fetch(
        `/api/admin/getTestRuns?limit=${pageSize}&offset=${page * pageSize}`,
      );
      const result = await response.json();
      setTestRuns(result.testRuns);
      setTotalRuns(result.totalCount);
    };
    fetchTestRuns();
  }, [page, pageSize]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const refreshSelectedRun = async () => {
    if (!selectedRun) return;
    
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/admin/getTestRun?testRunId=${selectedRun.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch updated run data');
      }
      const updatedRun = await response.json();
      
      // Update the run in the list
      setTestRuns(prevRuns => 
        prevRuns.map(run => 
          run.id === selectedRun.id ? updatedRun : run
        )
      );
      
      // Update the selected run
      setSelectedRun(updatedRun);
      
      // If we have a selected persona, make sure it's still valid
      if (selectedPersonaId) {
        const personaStillExists = updatedRun.personasOnRun.some(
          (p: { persona: { id: string } }) => p.persona.id === selectedPersonaId
        );
        if (!personaStillExists && updatedRun.personasOnRun.length > 0) {
          setSelectedPersonaId(updatedRun.personasOnRun[0].persona.id);
        }
      }
    } catch (error) {
      console.error('Error refreshing run:', error);
    } finally {
      setIsRefreshing(false);
    }
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
      <div ref={sidebarRef} className="w-1/4 bg-base-300 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">Runs</h2>
        {testRuns.map((run, index) => (
          <div
            key={run.id}
            ref={index === 0 ? testRunItemRef : null}
            onClick={() => {
              setSelectedRun(run);
              if (run.personasOnRun && run.personasOnRun.length > 0) {
                setSelectedPersonaId(run.personasOnRun[0].persona.id);
              } else {
                setSelectedPersonaId(null);
              }
            }}
            className={`cursor-pointer p-2 rounded hover:bg-base-200 ${
              selectedRun?.id === run.id ? "bg-base-100 font-bold" : ""
            }`}
          >
            {run.assistantName} ({new Date(run.createdAt).toLocaleString()})
          </div>
        ))}

        <div className="flex justify-between items-center mt-4">
          <button
            className="btn btn-sm"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={page === 0}
          >
            Previous
          </button>

          <span className="text-sm">
            Page {page + 1} of {Math.ceil(totalRuns / pageSize)}
          </span>

          <button
            className="btn btn-sm"
            onClick={() =>
              setPage((prev) =>
                (prev + 1) * pageSize < totalRuns ? prev + 1 : prev,
              )
            }
            disabled={(page + 1) * pageSize >= totalRuns}
          >
            Next
          </button>
        </div>
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
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-2xl font-bold">
                {selectedRun.assistantName}
              </h2>
              {selectedRun.updatedSystemPrompt && (
                <button
                  onClick={() => setShowPromptComparison((prev) => !prev)}
                  className="btn btn-sm btn-outline"
                >
                  {showPromptComparison
                    ? "Hide Updated Prompt"
                    : "View Updated Prompt"}
                </button>
              )}
              <button
                className="btn btn-sm btn-ghost"
                onClick={refreshSelectedRun}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "↻"
                )}
              </button>
            </div>

            {showPromptComparison ? (
              <div className="flex flex-col flex-grow bg-base-100 p-6">
                <h2 className="text-2xl font-bold mb-4">Prompt Changes</h2>
                <div className="bg-base-200 p-4 rounded">
                  <div className="flex justify-between mb-2 text-sm font-medium">
                    <span className="text-error">Old Prompt</span>
                    <span className="text-success">New Prompt</span>
                  </div>
                  <WordDiffViewer
                    oldValue={selectedRun.prompt}
                    newValue={selectedRun.updatedSystemPrompt || ""}
                  />
                </div>
                {selectedRun.explanation && (
                  <div className="bg-base-100 p-4 rounded shadow mt-4">
                    <h3 className="font-semibold mb-2">Explanation</h3>
                    <div className="whitespace-pre-wrap text-sm">
                      {selectedRun.explanation}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-base-content mb-4">
                {selectedRun.prompt.slice(0, 200)}...
              </p>
            )}

            {/* Persona Tabs */}
            {!showPromptComparison && (
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
            )}

            {!showPromptComparison && selectedPersona && (
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
                    } group relative flex items-center ${
                      msg.role === "assistant" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div className={`chat-bubble break-words whitespace-pre-wrap max-w-full ${
                      msg.role === "assistant" 
                        ? "bg-primary/10 text-base-content" 
                        : "bg-secondary/10 text-base-content"
                    }`} style={{ maxWidth: "80%" }}>
                      <strong>
                        {msg.role === "assistant"
                          ? "Chatbot"
                          : selectedPersona.persona.name}
                        :
                      </strong>{" "}
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
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
