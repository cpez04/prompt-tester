"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Persona, Message } from "@/types";
import {
  diff_match_patch,
  DIFF_DELETE,
  DIFF_INSERT,
  DIFF_EQUAL,
  Diff,
} from "diff-match-patch";
import { Copy } from "lucide-react";

type PersonaOnRun = {
  persona: Persona;
  threadId: string;
  messages: Message[];
  personaOnRunId: string;
};

type ChatbotThread = {
  personaName: string;
  threadId: string;
  messages: Message[];
  chatbotThreadId: string;
};

type TestRunData = {
  id: string;
  prompt: string;
  model: string;
  assistantId: string;
  assistantName: string;
  personaContext: string;
  personasOnRun: PersonaOnRun[];
  chatbotThreads: ChatbotThread[];
  files: { name: string; id: string }[];
  updatedSystemPrompt?: string;
  explanation?: string;
  createdAt: string;
};

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
    <div className="grid grid-cols-2 gap-4 font-mono text-base">
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
          className="whitespace-pre-wrap font-mono text-base w-full h-full min-h-[300px] p-2 bg-base-100 border border-base-300 rounded"
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

export default function EvaluateChats() {
  const router = useRouter();
  const params = useParams();
  const testRunId = params.testRunId as string;
  const [testRunData, setTestRunData] = useState<TestRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPromptComparison, setShowPromptComparison] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const fetchTestRun = async () => {
      try {
        const res = await fetch(`/api/getTestRun?testRunId=${testRunId}`);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            // Unauthorized or forbidden - redirect to playground
            router.push("/playground");
            return;
          }
          throw new Error("Failed to fetch test run data");
        }

        const data = await res.json();
        setTestRunData(data);
        // Set the first persona as selected by default
        if (data.personasOnRun && data.personasOnRun.length > 0) {
          setSelectedPersonaId(data.personasOnRun[0].persona.id);
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to load test run:", err);
        router.push("/playground");
      }
    };

    if (testRunId) fetchTestRun();
  }, [testRunId, router]);

  const [currentPersonaIndex, setCurrentPersonaIndex] = useState(0);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [thumbsRating, setThumbsRating] = useState<
    Record<string, "up" | "down" | null>
  >({});
  const [ratingError, setRatingError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [promptFeedbackResult, setPromptFeedbackResult] = useState<{
    updated_system_prompt: string;
    explanation: string;
  } | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPromptText, setEditedPromptText] = useState("");
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  const personas = testRunData?.personasOnRun.map((p) => p.persona) || [];
  const responses = useMemo(() => {
    const result: Record<string, Message[]> = {};

    testRunData?.personasOnRun.forEach(({ persona, messages }) => {
      result[persona.name] = messages;
    });

    testRunData?.chatbotThreads.forEach(({ personaName, messages }) => {
      result[personaName] = [...(result[personaName] || []), ...messages].sort(
        (a, b) =>
          new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime(),
      );
    });

    return result;
  }, [testRunData]);

  const currentPersona = personas[currentPersonaIndex];
  const currentMessages = responses[currentPersona?.name] || [];

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback((prev) => ({
      ...prev,
      [currentPersona.name]: e.target.value,
    }));
  };

  const handleThumbsClick = (type: "up" | "down") => {
    setThumbsRating((prev) => ({
      ...prev,
      [currentPersona.name]: type,
    }));
  };

  const handleNext = async () => {
    const rating = thumbsRating[currentPersona.name];

    if (!rating) {
      setRatingError(true);
      return;
    }

    setRatingError(false);

    if (currentPersonaIndex === personas.length - 1) {
      try {
        setSubmitting(true);

        const feedbackPayload = testRunData?.personasOnRun.map(
          ({ persona, personaOnRunId }) => ({
            personaOnRunId,
            liked: thumbsRating[persona.name] === "up",
            feedback: feedback[persona.name] || null,
          }),
        );

        await fetch("/api/savePersonaFeedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedbackPayload }),
        });

        // Check if all feedback is positive
        const allPositive = Object.values(thumbsRating).every(
          (rating) => rating === "up",
        );

        if (allPositive) {
          // If all feedback is positive, set the prompt feedback result with no changes
          setPromptFeedbackResult({
            updated_system_prompt: testRunData?.prompt || "",
            explanation:
              "All feedback was positive. No changes needed to the system prompt.",
          });

          // Update the test run with the same prompt
          await fetch("/api/updateTestRunPrompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              testRunId,
              updatedPrompt: testRunData?.prompt || "",
              explanation:
                "All feedback was positive. No changes needed to the system prompt.",
            }),
          });
        } else {
          // Only get prompt feedback if there were negative ratings
          const response = await fetch("/api/getPromptFeedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: testRunData?.prompt,
              feedback,
              thumbsRating,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            setPromptFeedbackResult(result);

            await fetch("/api/updateTestRunPrompt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                testRunId,
                updatedPrompt: result.updated_system_prompt,
                explanation: result.explanation,
              }),
            });
          }
        }
      } catch (err) {
        console.error("Error submitting feedback:", err);
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrentPersonaIndex((i) => i + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPersonaIndex > 0) {
      setCurrentPersonaIndex(currentPersonaIndex - 1);
    }
  };

  const handleEditPrompt = () => {
    setEditedPromptText(promptFeedbackResult?.updated_system_prompt || "");
    setIsEditingPrompt(true);
  };

  const handleSavePromptEdit = () => {
    if (promptFeedbackResult) {
      setPromptFeedbackResult({
        ...promptFeedbackResult,
        updated_system_prompt: editedPromptText,
      });

      // save the edited prompt to server
      fetch("/api/updateTestRunPrompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testRunId,
          updatedPrompt: editedPromptText,
          explanation: promptFeedbackResult.explanation,
        }),
      }).catch((error) => {
        console.error("Error saving edited prompt:", error);
      });
    }
    setIsEditingPrompt(false);
  };

  const handleCancelPromptEdit = () => {
    setIsEditingPrompt(false);
  };

  // Handle mouse down on divider
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const container = document.querySelector(".flex.flex-grow");
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit the width between 20% and 80% of the container
      setLeftPanelWidth(Math.min(Math.max(newWidth, 20), 80));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleCopyPrompt = async () => {
    const promptToCopy = isEditingPrompt
      ? editedPromptText
      : promptFeedbackResult?.updated_system_prompt || "";

    try {
      await navigator.clipboard.writeText(promptToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy prompt:", err);
    }
  };

  if (loading || !testRunData) {
    return <div className="p-4 text-center text-lg">Loading...</div>;
  }

  const selectedPersona = testRunData.personasOnRun.find(
    (p) => p.persona.id === selectedPersonaId,
  );

  const matchingChatbotThread = testRunData.chatbotThreads.find(
    (ct) => ct.personaName === selectedPersona?.persona.name,
  );

  const fullConversation = [
    ...(selectedPersona?.messages || []),
    ...(matchingChatbotThread?.messages || []),
  ].sort(
    (a, b) =>
      new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime(),
  );

  // If test run is completed (has updatedSystemPrompt) or expired, show view-only version
  const createdAt = new Date(testRunData.createdAt);
  const now = new Date();
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isExpired = !testRunData.updatedSystemPrompt && daysSinceCreation >= 60;

  if (testRunData.updatedSystemPrompt || isExpired) {
    return (
      <div className="flex min-h-screen bg-base-200">
        {/* Always visible toggle button when sidebar is collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="fixed left-4 top-4 z-50 btn btn-sm btn-circle btn-ghost hover:bg-base-300 transition-all duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        {/* Left Sidebar with Persona Tabs */}
        <div
          className={`fixed left-0 top-0 h-full bg-base-300 flex flex-col border-r border-base-200 transition-all duration-300 transform ${
            isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
          }`}
          style={{ width: "16rem" }}
        >
          <div className="p-4 flex flex-col flex-grow">
            {/* Sidebar Toggle Button (only visible when sidebar is open) */}
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="btn btn-sm btn-circle btn-ghost hover:bg-base-300 transition-all duration-300 mb-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            <div className="flex flex-col space-y-3">
              {testRunData.personasOnRun.map(({ persona }) => (
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
                      selectedPersonaId === persona.id
                        ? "bg-primary"
                        : "bg-base-content/40"
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

        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            isSidebarCollapsed ? "ml-0" : "ml-64"
          }`}
        >
          <div
            className={`flex flex-col flex-grow bg-base-100 p-6 ${
              isSidebarCollapsed ? "ml-12" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Test Run Results</h2>
                {!isExpired && (
                  <button
                    onClick={() => setShowPromptComparison((prev) => !prev)}
                    className="btn btn-sm btn-outline"
                  >
                    {showPromptComparison
                      ? "Hide Updated Prompt"
                      : "View Updated Prompt"}
                  </button>
                )}
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="btn btn-ghost"
              >
                ← Return to Dashboard
              </button>
            </div>
            {isExpired && (
              <div className="alert alert-error mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01M12 5a7 7 0 11-6.93 6.93A7 7 0 0112 5z"
                  />
                </svg>
                <span>This test run has expired and is now view-only.</span>
              </div>
            )}
            {showPromptComparison ? (
              <>
                <div className="bg-base-200 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 flex justify-between text-sm font-medium">
                      <span className="text-error">Old Prompt</span>
                      <span className="text-success">New Prompt</span>
                    </div>
                    <button
                      onClick={() => {
                        if (testRunData.updatedSystemPrompt) {
                          navigator.clipboard.writeText(
                            testRunData.updatedSystemPrompt,
                          );
                          setCopySuccess(true);
                          setTimeout(() => setCopySuccess(false), 2000);
                        }
                      }}
                      className="btn btn-sm btn-ghost tooltip tooltip-left ml-2"
                      data-tip={copySuccess ? "Copied!" : "Copy to clipboard"}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <WordDiffViewer
                    oldValue={testRunData.prompt}
                    newValue={
                      testRunData.updatedSystemPrompt || testRunData.prompt
                    }
                  />
                </div>
                {testRunData.explanation && (
                  <div className="bg-base-100 p-4 rounded shadow mt-4">
                    <h3 className="font-semibold mb-2">Explanation</h3>
                    <div className="whitespace-pre-wrap text-sm">
                      {testRunData.explanation}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Selected Persona's Conversation */}
                {selectedPersona && (
                  <div className="bg-base-200 p-4 rounded">
                    <h3 className="text-xl font-semibold mb-2">
                      {selectedPersona.persona.name}&apos;s Conversation
                    </h3>
                    <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
                      {fullConversation.map((msg, index) => (
                        <div
                          key={index}
                          className={`chat ${
                            msg.role === "assistant" ? "chat-start" : "chat-end"
                          }`}
                        >
                          <div
                            className={`chat-bubble ${
                              msg.role === "assistant"
                                ? "bg-primary/10 text-base-content"
                                : "bg-secondary/10 text-base-content"
                            }`}
                          >
                            <strong className="block mb-1">
                              {msg.role === "assistant"
                                ? "Chatbot"
                                : selectedPersona.persona.name}
                              :
                            </strong>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Original evaluation UI for incomplete test runs
  return (
    <div className="flex flex-col flex-grow w-full bg-base-200">
      {!promptFeedbackResult ? (
        <div className="flex flex-grow">
          {/* Conversation Panel */}
          <div
            className="overflow-y-auto p-4 border-r border-base-300 flex flex-col"
            style={{
              width: `${leftPanelWidth}%`,
              maxHeight: "calc(100vh - 2rem)",
            }}
          >
            <h2 className="text-xl font-bold mb-4">
              Conversation: {currentPersona.name}
            </h2>
            <div className="space-y-4 overflow-y-auto pr-2">
              {currentMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat ${msg.role === "assistant" ? "chat-start" : "chat-end"} group relative flex items-center ${
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
                    <strong className="block mb-1">
                      {msg.role === "assistant"
                        ? "Chatbot"
                        : currentPersona.name}
                      :
                    </strong>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Draggable Divider */}
          <div
            ref={dividerRef}
            className="w-1 bg-base-300 cursor-col-resize hover:bg-primary transition-colors"
            onMouseDown={handleMouseDown}
            style={{
              backgroundColor: isDragging ? "var(--primary)" : undefined,
            }}
          />

          {/* Feedback Panel */}
          <div
            className="p-6 flex flex-col"
            style={{ width: `${100 - leftPanelWidth}%` }}
          >
            <h2 className="text-xl font-bold mb-2">
              Feedback for {currentPersona.name}
            </h2>

            {/* Thumbs Rating */}
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-lg font-medium">
                How well did the <span className="font-bold">Chatbot</span>{" "}
                perform when interacting with{" "}
                <span className="font-bold">{currentPersona.name}</span>?
              </label>
              <div className="flex items-center gap-4">
                <div
                  className="tooltip"
                  data-tip="The chatbot handled this persona well."
                >
                  <button
                    className={`btn btn-sm ${
                      thumbsRating[currentPersona.name] === "up"
                        ? "btn-success"
                        : "btn-outline"
                    }`}
                    onClick={() => handleThumbsClick("up")}
                  >
                    👍
                  </button>
                </div>

                <div
                  className="tooltip"
                  data-tip="The chatbot struggled with this persona."
                >
                  <button
                    className={`btn btn-sm ${
                      thumbsRating[currentPersona.name] === "down"
                        ? "btn-error"
                        : "btn-outline"
                    }`}
                    onClick={() => handleThumbsClick("down")}
                  >
                    👎
                  </button>
                </div>
              </div>

              {ratingError && (
                <p className="text-sm text-error mt-1">
                  Please rate the chatbot&apos;s performance before continuing.
                </p>
              )}
            </div>

            {/* Feedback Textarea - Only if Thumbs Down */}
            {thumbsRating[currentPersona.name] === "down" && (
              <>
                <label className="text-sm mb-1">
                  What didn&apos;t work well in the chatbot&apos;s interaction
                  with{" "}
                  <span className="font-semibold">{currentPersona.name}</span>?
                </label>
                <textarea
                  className="textarea textarea-bordered h-60 resize-none mb-4"
                  placeholder="Describe how the chatbot struggled to handle this persona. What could it have done better?"
                  value={feedback[currentPersona.name] || ""}
                  onChange={handleFeedbackChange}
                />
              </>
            )}

            {/* Navigation Buttons (placed right below feedback/ratings) */}
            <div className="flex justify-between mt-4">
              <button
                className="btn btn-outline"
                onClick={handlePrevious}
                disabled={currentPersonaIndex === 0}
              >
                Previous
              </button>

              <button
                className="btn btn-outline"
                onClick={handleNext}
                disabled={submitting}
              >
                {currentPersonaIndex === personas.length - 1
                  ? submitting
                    ? "Submitting..."
                    : "Get Prompt Feedback"
                  : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-grow bg-base-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Prompt Feedback Results</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                localStorage.setItem(
                  "prompt",
                  promptFeedbackResult.updated_system_prompt,
                );
                router.push("/playground");
              }}
            >
              Redo with Improved Prompt →
            </button>
          </div>

          {/* Side-by-side Old and New Prompts */}
          <div className="flex w-full gap-6">
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">Prompt Changes</h3>
                <button
                  onClick={handleCopyPrompt}
                  className="btn btn-sm btn-ghost tooltip tooltip-left"
                  data-tip={copySuccess ? "Copied!" : "Copy to clipboard"}
                >
                  <Copy size={16} />
                </button>
              </div>
              <div className="bg-base-200 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 flex justify-between text-sm font-medium">
                    <span className="text-error">Old Prompt</span>
                    <span className="text-success">New Prompt</span>
                  </div>
                  <button
                    onClick={() => {
                      if (testRunData.updatedSystemPrompt) {
                        navigator.clipboard.writeText(
                          testRunData.updatedSystemPrompt,
                        );
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      }
                    }}
                    className="btn btn-sm btn-ghost tooltip tooltip-left ml-2"
                    data-tip={copySuccess ? "Copied!" : "Copy to clipboard"}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <WordDiffViewer
                  oldValue={testRunData?.prompt || ""}
                  newValue={
                    isEditingPrompt
                      ? editedPromptText
                      : promptFeedbackResult.updated_system_prompt
                  }
                  isEditing={isEditingPrompt}
                  onEdit={setEditedPromptText}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {isEditingPrompt ? (
                  <>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={handleSavePromptEdit}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={handleCancelPromptEdit}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={handleEditPrompt}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Explanation / Suggestions */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-2">
              Explanation and Suggestions
            </h3>
            <pre className="bg-base-200 p-4 rounded whitespace-pre-wrap">
              {promptFeedbackResult.explanation}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
