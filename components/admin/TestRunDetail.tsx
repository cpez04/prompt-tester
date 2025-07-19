"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import WordDiffViewer from "./WordDiffViewer";
import { TestRun } from "@/types/admin";

interface TestRunDetailProps {
  testRun: TestRun;
  isRefreshing: boolean;
  isSidebarCollapsed: boolean;
  onRefresh: () => void;
  onSidebarToggle: (collapsed: boolean) => void;
  onBack: () => void;
}

export default function TestRunDetail({
  testRun,
  isRefreshing,
  isSidebarCollapsed,
  onRefresh,
  onSidebarToggle,
  onBack,
}: TestRunDetailProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    testRun.personasOnRun?.[0]?.persona?.id || null
  );
  const [showPromptComparison, setShowPromptComparison] = useState(false);

  const selectedPersona = testRun.personasOnRun.find(
    (p) => p.persona.id === selectedPersonaId,
  );

  const matchingChatbotThread = testRun.chatbotThreads?.find(
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
    <div className="flex min-h-screen bg-base-200">
      {/* Sidebar Toggle Button (when collapsed) */}
      {isSidebarCollapsed && (
        <button
          onClick={() => onSidebarToggle(false)}
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
              onClick={() => onSidebarToggle(true)}
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
            {testRun.personasOnRun.map(({ persona }) => (
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

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? "ml-0" : "ml-64"}`}
      >
        <div
          className={`flex flex-col flex-grow bg-base-100 p-6 ${isSidebarCollapsed ? "ml-12" : ""}`}
        >
          <div className="flex items-center gap-4 mb-2">
            <button className="btn btn-ghost" onClick={onBack}>
              ← Back to Test Runs
            </button>
            <h2 className="text-2xl font-bold">{testRun.assistantName}</h2>
            {testRun.updatedSystemPrompt && (
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
              onClick={onRefresh}
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
                  oldValue={testRun.prompt || ""}
                  newValue={testRun.updatedSystemPrompt || ""}
                />
              </div>
              {testRun.explanation && (
                <div className="bg-base-100 p-4 rounded shadow mt-4">
                  <h3 className="font-semibold mb-2">Explanation</h3>
                  <div className="whitespace-pre-wrap text-sm">
                    {testRun.explanation}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {testRun.prompt && (
                <p className="text-sm text-base-content mb-4">
                  {testRun.prompt.slice(0, 200)}...
                </p>
              )}

              {selectedPersona && selectedPersona.messages && (
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
                        msg.role === "assistant"
                          ? "justify-start"
                          : "justify-end"
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
          )}
        </div>
      </div>
    </div>
  );
}