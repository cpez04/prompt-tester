"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Persona, Message } from "@/types";
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL, Diff } from 'diff-match-patch';

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
};

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

  useEffect(() => {
    const fetchTestRun = async () => {
      try {
        const res = await fetch(`/api/getTestRun?testRunId=${testRunId}`);
        if (!res.ok) throw new Error("Failed to fetch test run data");

        const data = await res.json();
        setTestRunData(data);
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
            }),
          });
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

  if (!testRunData || !testRunData.personasOnRun[currentPersonaIndex]) {
    return (
      <div className="p-4 text-center text-lg">Loading conversations...</div>
    );
  }

  return (
    <div className="flex flex-col flex-grow w-full bg-base-200">
      {!promptFeedbackResult ? (
        <div className="flex flex-grow">
          {/* Conversation Panel */}
          <div className="w-1/2 overflow-y-auto p-4 border-r border-base-300">
            <h2 className="text-xl font-bold mb-4">
              Conversation: {currentPersona.name}
            </h2>
            <div className="space-y-4">
              {currentMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat ${msg.role === "assistant" ? "chat-start" : "chat-end"}`}
                >
                  <div className="chat-bubble whitespace-pre-wrap">
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

          {/* Feedback Panel */}
          <div className="w-1/2 p-6 flex flex-col">
            <h2 className="text-xl font-bold mb-2">
              Feedback for {currentPersona.name}
            </h2>

            {/* Thumbs Rating */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-lg">Rate this conversation:</span>
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
              {ratingError && (
                <p className="text-sm text-error mt-1">
                  Please select 👍 or 👎 before continuing.
                </p>
              )}
            </div>

            {/* Feedback Textarea - Only if Thumbs Down */}
            {thumbsRating[currentPersona.name] === "down" && (
              <>
                <label className="text-sm mb-1">Optional Feedback:</label>
                <textarea
                  className="textarea textarea-bordered h-60 resize-none mb-4"
                  placeholder="What could be improved in this conversation?"
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
          <h2 className="text-2xl font-bold mb-4">Prompt Feedback Results</h2>

          {/* Side-by-side Old and New Prompts */}
          <div className="flex w-full gap-6">
            <div className="w-full">
              <h3 className="text-xl font-semibold mb-2">
                Prompt Changes
              </h3>
              <div className="bg-base-200 p-4 rounded">
                <div className="flex justify-between mb-2 text-sm font-medium">
                  <span className="text-error">Old Prompt</span>
                  <span className="text-success">New Prompt</span>
                </div>
                <WordDiffViewer
                  oldValue={testRunData?.prompt || ""}
                  newValue={isEditingPrompt ? editedPromptText : promptFeedbackResult.updated_system_prompt}
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

          {/* Redo Button */}
          <div className="mt-8 flex justify-end">
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
        </div>
      )}
    </div>
  );
}
