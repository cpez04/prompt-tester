"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

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
}

interface Message {
  role: "persona" | "assistant";
  content: string;
}

export default function RunTests() {
  const [storedData, setStoredData] = useState<StoredData | null>(null);
  const [responses, setResponses] = useState<Record<string, Message[]>>({});
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem("storedData");
    if (!data) {
      router.push("/");
      return;
    }
  
    const parsedData = JSON.parse(data) as StoredData;
    setStoredData(parsedData);
    setActivePersona(parsedData.personas[0]);
  }, []);
  
  useEffect(() => {
    if (!storedData) return; // Prevent running before storedData is set
  
    storedData.threads.forEach(({ persona, threadId }) => {
        startStreaming(threadId, persona);
    });
  }, [storedData]); // Ensures it runs only after `storedData` is set
  
  const startStreaming = async (threadId: string, persona: Persona) => {
    try {
      const response = await fetch("/api/createRun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId: storedData?.assistant.id, threadId }),
      });
  
      if (!response.ok || !response.body) {
        console.error(`Failed to start run for persona: ${persona.name}`);
        return;
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // We use a ref to hold the current message content
      let currentMessage = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);
  
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
  
            if (parsed.event === "thread.message.delta") {
              // Adjust this extraction path according to your API response
              const textContent = parsed.data.delta.content?.[0]?.text?.value || parsed.data.delta.text;
              if (textContent) {
                currentMessage += textContent;
  
                // Incrementally update the state:
                setResponses((prev) => {
                  // Copy the existing messages for this persona (or start with an empty array)
                  const updatedMessages = [...(prev[persona.name] || [])];
                  if (updatedMessages.length === 0) {
                    // If no message exists yet, add a new one
                    updatedMessages.push({ role: "persona", content: currentMessage });
                  } else {
                    // Otherwise, update the last message with the new accumulated content
                    updatedMessages[updatedMessages.length - 1] = {
                      role: "persona",
                      content: currentMessage,
                    };
                  }
                  return { ...prev, [persona.name]: updatedMessages };
                });
              }
            }
  
            // Optionally, if you have a separate completed event, you can perform additional actions:
            if (parsed.event === "thread.message.completed") {
              // You might want to finalize the message here or start a new message for subsequent responses
              // For example, you can reset the currentMessage for the next message:
              currentMessage = "";
            }
          } catch (error) {
            console.error("Error parsing stream:", error, "Line:", line);
          }
        }
      }
    } catch (error) {
      console.error(`Error streaming response for ${persona.name}:`, error);
    }
  };
  

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
          <h2 className="text-xl font-semibold">{activePersona.name}'s Conversation</h2>
          <p className="text-sm text-gray-500">{activePersona.description}</p>

          <div
            ref={chatContainerRef}
            className="flex flex-col flex-grow w-full max-w-3xl overflow-y-auto bg-base-100 rounded-lg border p-4"
          >
            {responses[activePersona.name] && responses[activePersona.name].length > 0 ? (
              <div className="flex flex-col space-y-2">
                {responses[activePersona.name].map((message, index) => (
                  <div
                    key={index}
                    className={`chat ${
                      message.role === "assistant" ? "chat-start" : "chat-end"
                    }`}
                  >
                    <div className="chat-bubble">
                      {message.role === "persona" && <strong>{activePersona.name}:</strong>} {message.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">Waiting for response...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}