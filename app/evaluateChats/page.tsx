"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStoredData } from "@/components/StoredDataContext";
import ReactMarkdown from "react-markdown";

export default function EvaluateChats() {
  const { storedData } = useStoredData();
  const router = useRouter();
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

  const personas = storedData?.personas || [];
  const responses = useMemo(() => storedData?.responses || {}, [storedData]);

  useEffect(() => {
    const hasMessages = Object.values(responses).some(
      (msgs) => msgs && msgs.length > 0,
    );
    if (!hasMessages) {
      router.push("/playground");
    }
  }, [responses, router]);

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

        const feedbackPayload = personas
          .map((persona) => {
            const thread = storedData?.threads?.find(
              (t) => t.persona.name === persona.name,
            );

            if (!thread?.personaOnRunId) return null;

            return {
              personaOnRunId: thread.personaOnRunId,
              liked: thumbsRating[persona.name] === "up", // or however you store likes
              feedback: feedback[persona.name] || null,
            };
          })
          .filter(Boolean); // filter out null entries

        console.log("Sending feedback for all personas:", feedbackPayload);

        await fetch("/api/savePersonaFeedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedbackPayload }),
        });

        const response = await fetch("/api/getPromptFeedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: storedData?.prompt,
            feedback,
            thumbsRating,
          }),
        });

        if (!response.ok) {
          console.error("Failed to get prompt feedback");
        } else {
          const result = await response.json();
          setPromptFeedbackResult(result);

          await fetch("/api/updateTestRunPrompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              testRunId: storedData?.testRunId,
              updatedPrompt: result.updated_system_prompt,
            }),
          });
        }
      } catch (error) {
        console.error("Error sending prompt feedback:", error);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (currentPersonaIndex < personas.length - 1) {
      setCurrentPersonaIndex(currentPersonaIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPersonaIndex > 0) {
      setCurrentPersonaIndex(currentPersonaIndex - 1);
    }
  };

  if (!storedData || !currentPersona) {
    return (
      <div className="p-4 text-center text-lg">Loading conversations...</div>
    );
  }

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
          testRunId: storedData?.testRunId,
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

  return (
    <div className="flex flex-col h-screen w-full bg-base-200">
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
            {/* Old Prompt */}
            <div className="w-1/2">
              <h3 className="text-xl font-semibold mb-2">
                Original System Prompt
              </h3>
              <pre className="bg-base-200 p-4 rounded whitespace-pre-wrap h-full">
                {storedData?.prompt || "No prompt available"}
              </pre>
            </div>

            {/* Improved Prompt with Edit functionality */}
            <div className="w-1/2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">
                  Improved System Prompt
                </h3>
                {!isEditingPrompt && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={handleEditPrompt}
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditingPrompt ? (
                <>
                  <textarea
                    className="textarea textarea-bordered w-full h-60 resize-none mb-2"
                    value={editedPromptText}
                    onChange={(e) => setEditedPromptText(e.target.value)}
                  />
                  <div className="flex gap-2">
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
                  </div>
                </>
              ) : (
                <pre className="bg-base-200 p-4 rounded whitespace-pre-wrap h-full">
                  {promptFeedbackResult.updated_system_prompt}
                </pre>
              )}
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
