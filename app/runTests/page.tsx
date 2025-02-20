"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

interface Persona {
  id: string;
  name: string;
  description: string;
}

interface Thread {
  persona: Persona;
  threadId: string;
}

interface StoredData {
  prompt: string;
  files: { name: string; id: string }[];
  personas: Persona[];
  assistant: { id: string; name: string; description: string; model: string };
  threads: Thread[];
  chatbotThreads?: { persona: string; threadId: string }[];
}

interface Message {
  role: "persona" | "assistant";
  content: string;
}

const MAX_MESSAGES_PER_SIDE = 5; // 10 messages total (5 each)

export default function RunTests() {
  const [storedData, setStoredData] = useState<StoredData | null>(null);
  const [responses, setResponses] = useState<Record<string, Message[]>>({});
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const getChatbotResponse = useCallback(
    async (
      chatbotThread: string,
      persona: Persona,
      message: string,
      messageCount: number,
    ) => {
      if (messageCount >= MAX_MESSAGES_PER_SIDE * 2) return; // Stop if we reached the limit

      try {
        if (!message.trim()) {
          console.warn(
            `Skipping chatbot response for ${persona.name}, message is empty.`,
          );
          return;
        }

        console.log(
          `Fetching chatbot response for ${persona.name} with message:`,
          message,
        );

        const response = await fetch("/api/generateResponse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            assistantId: storedData?.assistant.id,
            threadId: chatbotThread,
          }),
        });

        if (!response.ok || !response.body) {
          console.error(
            `Failed to get chatbot response for persona: ${persona.name}`,
          );
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedMessage = "";

        setResponses((prev) => ({
          ...prev,
          [persona.name]: [
            ...(prev[persona.name] || []),
            { role: "assistant", content: "" },
          ],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          accumulatedMessage += chunk;

          setResponses((prev) => {
            const updatedMessages = [...(prev[persona.name] || [])];
            updatedMessages[updatedMessages.length - 1] = {
              role: "assistant",
              content: accumulatedMessage,
            };
            return { ...prev, [persona.name]: updatedMessages };
          });
        }

        const personaThread = storedData?.threads.find(
          (t) => t.persona.id === persona.id,
        )?.threadId;

        if (personaThread) {
          console.log(
            `Starting streaming for ${persona.name} with threadId: ${personaThread}`,
          );
          setTimeout(
            () =>
              startStreaming(
                personaThread,
                persona,
                accumulatedMessage,
                messageCount + 1,
              ),
            500,
          );
        }
      } catch (error) {
        console.error(
          `Error streaming chatbot response for ${persona.name}:`,
          error,
        );
      }
    },
    [storedData, setResponses],
  );

  const startStreaming = useCallback(
    async (
      threadId: string,
      persona: Persona,
      lastChatbotMessage: string,
      messageCount: number,
    ) => {
      if (messageCount >= MAX_MESSAGES_PER_SIDE * 2) return; // Stop if we reached the limit

      try {
        const response = await fetch("/api/createRun", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assistantId: storedData?.assistant.id,
            threadId,
            lastChatbotMessage,
          }),
        });

        if (!response.ok || !response.body) {
          console.error(`Failed to start run for persona: ${persona.name}`);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedMessage = "";

        setResponses((prev) => ({
          ...prev,
          [persona.name]: [
            ...(prev[persona.name] || []),
            { role: "persona", content: "" },
          ],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          accumulatedMessage += chunk;

          setResponses((prev) => {
            const updatedMessages = [...(prev[persona.name] || [])];
            updatedMessages[updatedMessages.length - 1] = {
              role: "persona",
              content: accumulatedMessage,
            };
            return { ...prev, [persona.name]: updatedMessages };
          });
        }

        const chatbotThread = storedData?.chatbotThreads?.find(
          (ct) => ct.persona === persona.name,
        )?.threadId;

        if (chatbotThread) {
          console.log("Triggering chatbot response for persona:", persona.name);
          setTimeout(
            () =>
              getChatbotResponse(
                chatbotThread,
                persona,
                accumulatedMessage,
                messageCount + 1,
              ),
            500,
          );
        }
      } catch (error) {
        console.error(`Error streaming response for ${persona.name}:`, error);
      }
    },
    [storedData, getChatbotResponse],
  );

  useEffect(() => {
    const data = localStorage.getItem("storedData");
    if (!data) {
      router.push("/");
      return;
    }

    const parsedData = JSON.parse(data) as StoredData;
    setStoredData(parsedData);
    setActivePersona(parsedData.personas[0]);
  }, [router]);

  useEffect(() => {
    if (!storedData) return;

    storedData.threads.forEach(({ persona, threadId }) => {
      startStreaming(threadId, persona, "", 0);
    });
  }, [storedData, startStreaming]);

  if (!storedData) return <p className="text-center text-lg">Loading...</p>;

  return (
    <div className="flex flex-col h-screen w-screen bg-base-200">
      <div className="w-full flex justify-center bg-base-300 p-3">
        {storedData.personas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => setActivePersona(persona)}
            className={`btn btn-sm mx-2 ${
              activePersona?.id === persona.id ? "btn-primary" : "btn-outline"
            }`}
          >
            {persona.name}
          </button>
        ))}
      </div>

      {activePersona && (
        <div className="flex flex-col flex-grow items-center justify-center">
          <h2 className="text-xl font-semibold">
            {activePersona.name}&apos;s Conversation
          </h2>
          <p className="text-sm text-gray-500">{activePersona.description}</p>

          <div
            ref={chatContainerRef}
            className="flex flex-col flex-grow w-11/12 max-w-6xl overflow-y-auto bg-base-100 rounded-lg border p-4 shadow-lg"
          >
            {responses[activePersona.name] &&
            responses[activePersona.name].length > 0 ? (
              <div className="flex flex-col space-y-2">
                {responses[activePersona.name].map((message, index) => (
                  <div
                    key={index}
                    className={`chat ${
                      message.role === "assistant" ? "chat-start" : "chat-end"
                    }`}
                  >
                    <div className="chat-bubble">
                      {message.role === "persona" && (
                        <strong>{activePersona.name}:</strong>
                      )}{" "}
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Waiting for response...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
