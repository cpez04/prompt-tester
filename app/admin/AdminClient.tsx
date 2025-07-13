"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import {
  diff_match_patch,
  DIFF_DELETE,
  DIFF_INSERT,
  DIFF_EQUAL,
  Diff,
} from "diff-match-patch";
import ProfileIcon from "@/components/ProfileIcon";
import UsersTab from "@/components/UsersTab";
import { useAdminStatus } from "@/hooks/useAdminStatus";

function WordDiffViewer({
  oldValue,
  newValue,
  isEditing = false,
  onEdit = () => {},
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
  status: "Complete" | "In Progress";
  userId: string;
  user: {
    firstName: string;
    lastName: string;
  } | null;
}

interface AdminClientProps {
  userEmail: string;
}

export default function AdminClient({ userEmail }: AdminClientProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin } = useAdminStatus();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showPromptComparison, setShowPromptComparison] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"runs" | "users" | "admin" | "metrics" | "features">("runs");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [runToDelete, setRunToDelete] = useState<TestRun | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [metrics, setMetrics] = useState<{
    totalMessages: number;
    totalRuns: number;
    averageMessagesPerRun: number;
  } | null>(null);
  const [page, setPage] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const PAGE_SIZE = 9;
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRunForDetails, setSelectedRunForDetails] = useState<TestRun | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState<string>("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const router = useRouter();
  const supabase = createPagesBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
      }
      setLoading(false);
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    const fetchTestRuns = async () => {
      setIsLoadingPage(true);
      try {
        const response = await fetch(
          `/api/admin/getTestRuns?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${
            creatorFilter ? `&creator=${encodeURIComponent(creatorFilter)}` : ""
          }`,
        );
        const result = await response.json();
        setTestRuns(result.testRuns);
        setTotalRuns(result.totalCount);
      } catch (error) {
        console.error("Error fetching test runs:", error);
      } finally {
        setIsLoadingPage(false);
      }
    };
    fetchTestRuns();
  }, [page, creatorFilter]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/admin/metrics");
        if (!response.ok) throw new Error("Failed to fetch metrics");
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };
    fetchMetrics();
  }, []);

  const refreshSelectedRun = async () => {
    if (!selectedRun) return;

    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/admin/getTestRun?testRunId=${selectedRun.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch updated run data");
      }
      const updatedRun = await response.json();
      setTestRuns((prevRuns) =>
        prevRuns.map((run) => (run.id === selectedRun.id ? updatedRun : run)),
      );
      setSelectedRun(updatedRun);
      if (selectedPersonaId) {
        const personaStillExists = updatedRun.personasOnRun.some(
          (p: { persona: { id: string } }) => p.persona.id === selectedPersonaId,
        );
        if (!personaStillExists && updatedRun.personasOnRun.length > 0) {
          setSelectedPersonaId(updatedRun.personasOnRun[0].persona.id);
        }
      }
    } catch (error) {
      console.error("Error refreshing run:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteRun = async () => {
    if (!runToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/deleteTestRun?testRunId=${runToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete test run");
      }

      setTestRuns((prevRuns) => prevRuns.filter((run) => run.id !== runToDelete.id));

      if (selectedRun?.id === runToDelete.id) {
        setSelectedRun(null);
        setSelectedPersonaId(null);
      }

      setShowDeleteModal(false);
      setRunToDelete(null);
    } catch (error) {
      console.error("Error deleting test run:", error);
      alert("Failed to delete test run");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    setIsLoadingPage(true);
    try {
      const response = await fetch(
        `/api/admin/getTestRuns?limit=${PAGE_SIZE}&offset=${newPage * PAGE_SIZE}`,
      );
      const result = await response.json();
      setTestRuns(result.testRuns);
      setTotalRuns(result.totalCount);
      setPage(newPage);
    } catch (error) {
      console.error("Error fetching test runs:", error);
    } finally {
      setIsLoadingPage(false);
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

  function FeaturesTab() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Prompt Tester</h2>
              <p>Test your system prompts against a variety of personas and receive feedback.</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary" onClick={() => router.push("/playground")}>
                  Open Prompt Tester
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-2">
                <h2 className="card-title">Syllabus Tester</h2>
                <div className="badge badge-secondary">BETA</div>
              </div>
              <p>Stress test your class&apos;s syllabus against a variety of personas.</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary" onClick={() => router.push("/syllabusplayground")}>
                  Open Syllabus Tester
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center mb-8">
        {selectedRun ? (
          <button className="btn btn-ghost" onClick={() => setSelectedRun(null)}>
            ← Back to Test Runs
          </button>
        ) : (
          <div className="tabs tabs-boxed">
            <a
              className={`tab ${activeTab === "runs" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("runs")}
            >
              Test Runs
            </a>
            <a
              className={`tab ${activeTab === "users" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              Users
            </a>
            <a
              className={`tab ${activeTab === "metrics" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("metrics")}
            >
              Metrics
            </a>
            <a
              className={`tab ${activeTab === "features" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("features")}
            >
              Features
            </a>
          </div>
        )}
        <ProfileIcon user={user} loading={loading} isAdmin={isAdmin} />
      </div>

      <div className="max-w-7xl mx-auto">
        {selectedRun ? (
          <div className="flex min-h-screen bg-base-200">
            {/* Sidebar and main content - keeping original layout */}
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="fixed left-4 top-4 z-50 btn btn-sm btn-circle btn-ghost hover:bg-base-300 transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {/* Left Sidebar */}
            <div
              className={`fixed left-0 top-0 h-full bg-base-300 flex flex-col border-r border-base-200 transition-all duration-300 transform ${
                isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
              }`}
              style={{ width: "16rem" }}
            >
              <div className="p-4 flex flex-col flex-grow">
                {!isSidebarCollapsed && (
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="btn btn-sm btn-circle btn-ghost hover:bg-base-300 transition-all duration-300 mb-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                <div className="flex flex-col space-y-3">
                  {selectedRun.personasOnRun.map(({ persona }) => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersonaId(persona.id)}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                        selectedPersonaId === persona.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-base-200 text-base-content/80"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          selectedPersonaId === persona.id ? "bg-primary" : "bg-base-content/40"
                        }`}
                      />
                      <span className="text-sm font-medium truncate transition-colors duration-300">
                        {persona.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? "ml-0" : "ml-64"}`}>
              <div className={`flex flex-col flex-grow bg-base-100 p-6 ${isSidebarCollapsed ? "ml-12" : ""}`}>
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="text-2xl font-bold">{selectedRun.assistantName}</h2>
                  {selectedRun.updatedSystemPrompt && (
                    <button
                      onClick={() => setShowPromptComparison((prev) => !prev)}
                      className="btn btn-sm btn-outline"
                    >
                      {showPromptComparison ? "Hide Updated Prompt" : "View Updated Prompt"}
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={refreshSelectedRun}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? <span className="loading loading-spinner loading-sm" /> : "↻"}
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
                        <div className="whitespace-pre-wrap text-sm">{selectedRun.explanation}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-base-content mb-4">{selectedRun.prompt.slice(0, 200)}...</p>

                    {selectedPersona && (
                      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
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
                              <p><strong>Comment:</strong> {selectedPersona.feedback}</p>
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
                            <div
                              className={`chat-bubble break-words whitespace-pre-wrap max-w-full ${
                                msg.role === "assistant"
                                  ? "bg-primary/10 text-base-content"
                                  : "bg-secondary/10 text-base-content"
                              }`}
                              style={{ maxWidth: "80%" }}
                            >
                              <strong>
                                {msg.role === "assistant" ? "Chatbot" : selectedPersona.persona.name}:
                              </strong>{" "}
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "runs" && (
              <>
                <div className="flex justify-end mb-6">
                  <label className="input input-bordered flex items-center gap-2 w-full max-w-xs">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 text-base-content/60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      className="grow"
                      placeholder="Filter by user..."
                      value={creatorFilter}
                      onChange={(e) => setCreatorFilter(e.target.value)}
                    />
                    {creatorFilter && (
                      <button onClick={() => setCreatorFilter("")} className="btn btn-sm btn-ghost px-2">
                        ✕
                      </button>
                    )}
                  </label>
                </div>

                {isLoadingPage ? (
                  <div className="flex justify-center items-center min-h-[400px]">
                    <span className="loading loading-dots loading-lg"></span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {testRuns.map((run) => (
                        <div
                          key={run.id}
                          className="card bg-base-100 shadow-md border border-base-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest(".dropdown")) return;
                            setSelectedRun(run);
                            if (run.personasOnRun && run.personasOnRun.length > 0) {
                              setSelectedPersonaId(run.personasOnRun[0].persona.id);
                            }
                          }}
                        >
                          <div className="card-body">
                            <div className="flex justify-between items-start">
                              <h2 className="card-title text-base font-semibold">{run.assistantName}</h2>
                              <div className="dropdown dropdown-end">
                                <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                  </svg>
                                </div>
                                <ul
                                  tabIndex={0}
                                  className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                                >
                                  <li>
                                    <a
                                      onClick={() => {
                                        setRunToDelete(run);
                                        setShowDeleteModal(true);
                                      }}
                                    >
                                      Delete
                                    </a>
                                  </li>
                                </ul>
                              </div>
                            </div>
                            <div className="text-sm text-base-content/80">
                              <div><span className="font-medium">Model:</span> {run.model}</div>
                              <div><span className="font-medium">Created:</span> {new Date(run.createdAt).toLocaleDateString()}</div>
                              <div>
                                <span className="font-medium">User:</span>{" "}
                                {run.user ? `${run.user.firstName} ${run.user.lastName}`.trim() : "Unknown"}
                              </div>
                              <div className="mt-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    run.status === "Complete"
                                      ? "bg-success/20 text-success"
                                      : "bg-warning/20 text-warning"
                                  }`}
                                >
                                  {run.status === "Complete" ? "Completed" : "In Progress"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {Math.ceil(totalRuns / PAGE_SIZE) > 1 && (
                      <div className="flex justify-center items-center gap-4 mt-8">
                        <button
                          className="btn btn-sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 0 || isLoadingPage}
                        >
                          Previous
                        </button>
                        <span className="text-sm">
                          Page {page + 1} of {Math.ceil(totalRuns / PAGE_SIZE)}
                        </span>
                        <button
                          className="btn btn-sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={(page + 1) * PAGE_SIZE >= totalRuns || isLoadingPage}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {activeTab === "metrics" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics ? (
                  <>
                    <div className="card bg-base-100 shadow-md">
                      <div className="card-body">
                        <h2 className="card-title">Total Messages</h2>
                        <p className="text-3xl font-bold">{metrics.totalMessages}</p>
                      </div>
                    </div>
                    <div className="card bg-base-100 shadow-md">
                      <div className="card-body">
                        <h2 className="card-title">Total Test Runs</h2>
                        <p className="text-3xl font-bold">{metrics.totalRuns}</p>
                      </div>
                    </div>
                    <div className="card bg-base-100 shadow-md">
                      <div className="card-body">
                        <h2 className="card-title">Avg. Messages per Run</h2>
                        <p className="text-3xl font-bold">{metrics.averageMessagesPerRun.toFixed(1)}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 flex justify-center">
                    <span className="loading loading-spinner loading-lg" />
                  </div>
                )}
              </div>
            )}

            {activeTab === "users" && (
              <div className="overflow-x-auto">
                <UsersTab />
              </div>
            )}

            {activeTab === "features" && <FeaturesTab />}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <dialog className={`modal ${showDeleteModal ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete Test Run</h3>
          <p className="py-4">
            Are you sure you want to delete this test run? This action cannot be undone.
          </p>
          <div className="modal-action">
            <button
              className="btn"
              onClick={() => {
                setShowDeleteModal(false);
                setRunToDelete(null);
              }}
            >
              Cancel
            </button>
            <button className="btn btn-error" onClick={handleDeleteRun} disabled={isDeleting}>
              {isDeleting ? <span className="loading loading-spinner loading-sm" /> : "Delete"}
            </button>
          </div>
        </div>
      </dialog>

      {/* Test Run Details Modal */}
      <dialog className={`modal ${showDetailsModal ? "modal-open" : ""}`}>
        <div className="modal-box max-w-3xl">
          <h3 className="font-bold text-lg mb-4">Test Run Details</h3>
          {selectedRunForDetails && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">System Prompt</h4>
                <div className="bg-base-200 p-4 rounded">
                  <pre className="whitespace-pre-wrap text-sm">{selectedRunForDetails.prompt}</pre>
                </div>
              </div>
              {selectedRunForDetails.updatedSystemPrompt && (
                <div>
                  <h4 className="font-semibold mb-2">Updated System Prompt</h4>
                  <div className="bg-base-200 p-4 rounded">
                    <pre className="whitespace-pre-wrap text-sm">{selectedRunForDetails.updatedSystemPrompt}</pre>
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-2">Persona Context</h4>
                <div className="bg-base-200 p-4 rounded">
                  <pre className="whitespace-pre-wrap text-sm">{selectedRunForDetails.personaContext}</pre>
                </div>
              </div>
              {selectedRunForDetails.explanation && (
                <div>
                  <h4 className="font-semibold mb-2">Explanation</h4>
                  <div className="bg-base-200 p-4 rounded">
                    <pre className="whitespace-pre-wrap text-sm">{selectedRunForDetails.explanation}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="modal-action">
            <button
              className="btn"
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedRunForDetails(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}