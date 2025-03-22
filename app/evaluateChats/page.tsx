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
  const [submitting, setSubmitting] = useState(false);
  const [promptFeedbackResult, setPromptFeedbackResult] = useState<{
    updated_system_prompt: string;
    explanation: string;
  } | null>(null);

  const personas = storedData?.personas || [];
  const responses = useMemo(() => storedData?.responses || {}, [storedData]);

  useEffect(() => {
    const hasMessages = Object.values(responses).some(
      (msgs) => msgs && msgs.length > 0,
    );
    if (!hasMessages) {
      router.push("/");
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

  const handleNext = async () => {
  
    if (currentPersonaIndex === personas.length - 1) {
      try {
        setSubmitting(true);
        const response = await fetch("/api/getPromptFeedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: storedData?.prompt,
            feedback,
          }),
        });

        if (!response.ok) {
          console.error("Failed to get prompt feedback");
        } else {
          const result = await response.json();
          setPromptFeedbackResult(result);
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
            <h2 className="text-xl font-bold mb-4">
              Feedback for {currentPersona.name}
            </h2>
            <textarea
              className="textarea textarea-bordered h-60 resize-none mb-4"
              placeholder="Write your feedback on this conversation with respect to the system prompt..."
              value={feedback[currentPersona.name] || ""}
              onChange={handleFeedbackChange}
            />

            <div className="flex justify-between mt-2">
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
      <h3 className="text-xl font-semibold mb-2">Original System Prompt</h3>
      <pre className="bg-base-200 p-4 rounded whitespace-pre-wrap h-full">
        {storedData?.prompt || "No prompt available"}
      </pre>
    </div>

    {/* New Prompt */}
    <div className="w-1/2">
      <h3 className="text-xl font-semibold mb-2">Improved System Prompt</h3>
      <pre className="bg-base-200 p-4 rounded whitespace-pre-wrap h-full">
        {promptFeedbackResult.updated_system_prompt}
      </pre>
    </div>
  </div>

  {/* Explanation / Suggestions */}
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-2">Explanation and Suggestions</h3>
    <pre className="bg-base-200 p-4 rounded whitespace-pre-wrap">
      {promptFeedbackResult.explanation}
    </pre>
  </div>
</div>

      )}
    </div>
  );
}
