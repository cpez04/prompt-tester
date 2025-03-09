"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStoredData } from "@/components/StoredDataContext";
import ExportChatsModal from "@/components/ExportChatsModal";
import ReactMarkdown from "react-markdown";
import { Pencil, RefreshCw } from "lucide-react";
import JSZip from "jszip";
import { Persona, Message } from "@/types";

const MAX_MESSAGES_PER_SIDE = 3; // 10 messages total (5 each)

export default function RunTests() {
  const { storedData } = useStoredData();
  const [responses, setResponses] = useState<Record<string, Message[]>>({});
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const hasRun = useRef(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [regenerationConfirmOpen, setRegenerationConfirmOpen] = useState(false);
  const [personaToRegenerate, setPersonaToRegenerate] =
    useState<Persona | null>(null);

  // New states for message editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const isConversationComplete = useCallback(
    (personaName: string) => {
      const messages = responses[personaName] || [];
      return (
        messages.length === MAX_MESSAGES_PER_SIDE * 2 &&
        messages.every((msg) => !msg.isLoading)
      );
    },
    [responses],
  );

  const hasFinishedMessages = Object.values(responses).some(
    (messages) =>
      messages.length === MAX_MESSAGES_PER_SIDE * 2 &&
      messages.every((msg) => !msg.isLoading),
  );

  const exportChats = async () => {
    if (selectedPersonas.length === 0) return;

    const zip = new JSZip();

    selectedPersonas.forEach((personaName) => {
      const messages = responses[personaName] || [];
      const conversationText = messages
        .filter((msg) => !msg.isLoading)
        .map(
          (msg) =>
            `${msg.role === "persona" ? personaName : "Chatbot"}: ${msg.content}\n`,
        )
        .join("\n");

      zip.file(`${personaName}_chat.txt`, conversationText);
    });

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Create a download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chats.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportModalOpen(false);
    } catch (error) {
      console.error("Error generating ZIP file:", error);
    }
  };

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

        // Add loading message for assistant
        setResponses((prev) => ({
          ...prev,
          [persona.name]: [
            ...(prev[persona.name] || []),
            { role: "assistant", content: "", isLoading: true },
          ],
        }));

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

        // Update the loading state once we start receiving content
        setResponses((prev) => {
          const updatedMessages = [...(prev[persona.name] || [])];
          updatedMessages[updatedMessages.length - 1] = {
            role: "assistant",
            content: "",
            isLoading: false,
          };
          return { ...prev, [persona.name]: updatedMessages };
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          let filteredMessage = "";
          let filtering = false;

          for (const char of chunk) {
            if (char === "【") {
              filtering = true;
            } else if (char === "】" && filtering) {
              filtering = false;
            } else if (!filtering) {
              filteredMessage += char;
            } else {
            }
          }

          accumulatedMessage += filteredMessage;

          setResponses((prev) => {
            const updatedMessages = [...(prev[persona.name] || [])];
            updatedMessages[updatedMessages.length - 1] = {
              role: "assistant",
              content: accumulatedMessage,
              isLoading: false,
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
        // Add loading message for persona
        setResponses((prev) => ({
          ...prev,
          [persona.name]: [
            ...(prev[persona.name] || []),
            { role: "persona", content: "", isLoading: true },
          ],
        }));

        const response = await fetch("/api/createRun", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assistantId: storedData?.assistant.id,
            threadId,
            lastChatbotMessage,
            persona,
          }),
        });

        if (!response.ok || !response.body) {
          console.error(`Failed to start run for persona: ${persona.name}`);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedMessage = "";

        // Update loading state once we start receiving content
        setResponses((prev) => {
          const updatedMessages = [...(prev[persona.name] || [])];
          updatedMessages[updatedMessages.length - 1] = {
            role: "persona",
            content: "",
            isLoading: false,
          };
          return { ...prev, [persona.name]: updatedMessages };
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          let filteredMessage = "";
          let filtering = false;

          for (const char of chunk) {
            if (char === "【") {
              filtering = true;
            } else if (char === "】" && filtering) {
              filtering = false;
            } else if (!filtering) {
              filteredMessage += char;
            } else {
            }
          }

          accumulatedMessage += filteredMessage;

          setResponses((prev) => {
            const updatedMessages = [...(prev[persona.name] || [])];
            updatedMessages[updatedMessages.length - 1] = {
              role: "persona",
              content: accumulatedMessage,
              isLoading: false,
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

  // New function to handle message editing
  const handleEditMessage = (index: number, persona: Persona) => {
    const messages = responses[persona.name] || [];
    if (messages[index]?.role === "persona") {
      setEditingIndex(index);
      setEditContent(messages[index].content);
    }
  };

  // New function to save edited message and regenerate conversation
  const saveEditedMessage = async (persona: Persona) => {
    if (editingIndex === null) return;

    // Save the edited message
    setResponses((prev) => {
      const messages = [...(prev[persona.name] || [])];

      // Update the edited message
      messages[editingIndex] = {
        ...messages[editingIndex],
        content: editContent,
      };

      // Remove all messages after the edited one
      const truncatedMessages = messages.slice(0, editingIndex + 1);

      return { ...prev, [persona.name]: truncatedMessages };
    });

    // Reset editing state
    setEditingIndex(null);
    setEditContent("");

    // Regenerate conversation from this point
    setTimeout(() => {
      // Get necessary threads for regeneration
      const chatbotThread = storedData?.chatbotThreads?.find(
        (ct) => ct.persona === persona.name,
      )?.threadId;

      if (chatbotThread) {
        // Start regenerating from the next message index
        getChatbotResponse(
          chatbotThread,
          persona,
          editContent,
          editingIndex + 1,
        );
      }
    }, 500);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingIndex(null);
    setEditContent("");
  };

  // New function to handle regeneration request
  const handleRegenerateRequest = (persona: Persona) => {
    setPersonaToRegenerate(persona);
    setRegenerationConfirmOpen(true);
  };

  // New function to regenerate entire conversation
  const regenerateConversation = () => {
    if (!personaToRegenerate) return;

    // Clear all messages for this persona
    setResponses((prev) => ({
      ...prev,
      [personaToRegenerate.name]: [],
    }));

    // Find the thread for this persona and restart the conversation
    const threadId = storedData?.threads.find(
      (t) => t.persona.id === personaToRegenerate.id,
    )?.threadId;

    if (threadId) {
      // Start a new conversation from scratch
      setTimeout(() => {
        startStreaming(threadId, personaToRegenerate, "", 0);
      }, 500);
    }

    // Close the confirmation dialog
    setRegenerationConfirmOpen(false);
    setPersonaToRegenerate(null);
  };

  useEffect(() => {
    if (!storedData) {
      router.push("/");
      return;
    }
    setActivePersona(storedData.personas[0]);
  }, [storedData, router]);

  useEffect(() => {
    if (!storedData || hasRun.current) return;

    storedData.threads.forEach(({ persona, threadId }) => {
      if (persona.initialQuestion?.trim()) {
        // Insert the initial question as the first message from persona
        setResponses((prev) => ({
          ...prev,
          [persona.name]: [
            {
              role: "persona",
              content: persona.initialQuestion!,
              isLoading: false,
            },
          ],
        }));

        // Then immediately trigger chatbot response
        const chatbotThread = storedData?.chatbotThreads?.find(
          (ct) => ct.persona === persona.name,
        )?.threadId;

        if (chatbotThread) {
          setTimeout(() => {
            getChatbotResponse(
              chatbotThread,
              persona,
              persona.initialQuestion!,
              1,
            );
          }, 500);
        }
      } else {
        // Fallback: start persona streaming
        startStreaming(threadId, persona, "", 0);
      }
    });

    hasRun.current = true;
  }, [storedData, startStreaming]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [responses, activePersona]);

  if (!storedData) return <p className="text-center text-lg">Loading...</p>;

  return (
    <div className="flex flex-col h-screen w-screen bg-base-200">
      {/* Persona Selection Row */}
      <div className="w-full flex justify-between items-center bg-base-300 p-3">
        {/* Persona Buttons */}
        <div className="flex space-x-2">
          {storedData.personas.map((persona) => {
            const messages = responses[persona.name] || [];
            const completedMessages = messages.filter(
              (msg) => !msg.isLoading,
            ).length;
            const progressValue =
              (completedMessages / (MAX_MESSAGES_PER_SIDE * 2)) * 100;
            const isComplete = isConversationComplete(persona.name);

            return (
              <div key={persona.id} className="flex flex-col items-center">
                <div className="flex items-center">
                  <button
                    onClick={() => setActivePersona(persona)}
                    className={`btn btn-sm ${
                      activePersona?.id === persona.id
                        ? "btn-primary"
                        : "btn-outline"
                    }`}
                  >
                    {persona.name}
                  </button>
                </div>
                <progress
                  className={`progress w-32 mt-1 ${
                    progressValue < 40
                      ? "progress-info"
                      : progressValue < 80
                        ? "progress-warning"
                        : "progress-success"
                  }`}
                  value={progressValue}
                  max="100"
                ></progress>
              </div>
            );
          })}
        </div>

        {/* Export Button */}
        <button
          className="btn btn-sm btn-accent"
          onClick={() => setExportModalOpen(true)}
          disabled={!hasFinishedMessages}
        >
          Export Chats
        </button>
      </div>

      {/* Export Modal */}
      <ExportChatsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        personas={storedData.personas}
        selectedPersonas={selectedPersonas}
        setSelectedPersonas={setSelectedPersonas}
        exportChats={exportChats}
      />

      {/* Regeneration Confirmation Modal */}
      {regenerationConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md">
            <h3 className="font-bold text-lg mb-2">Regenerate Conversation</h3>
            <p className="mb-4">
              Are you sure you want to regenerate the entire conversation for
              the {personaToRegenerate?.name} persona? This will erase all of
              its current messages.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setRegenerationConfirmOpen(false);
                  setPersonaToRegenerate(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={regenerateConversation}
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {activePersona && (
        <div className="flex flex-col flex-grow items-center w-full">
          <h2 className="text-xl font-semibold mt-2">
            {activePersona.name}&apos;s Conversation
            {/* Adding refresh button next to conversation title as well */}
            {isConversationComplete(activePersona.name) && (
              <button
                onClick={() => handleRegenerateRequest(activePersona)}
                className="btn btn-sm btn-ghost btn-circle ml-2"
                title="Regenerate conversation"
              >
                <RefreshCw size={16} />
              </button>
            )}
          </h2>
          <p className="text-sm text-gray-500">{activePersona.description}</p>

          <div
            ref={chatContainerRef}
            className="flex flex-col w-11/12 max-w-6xl flex-grow 
            bg-base-100 rounded-lg border p-4 shadow-lg 
            max-h-[80vh] overflow-y-auto"
          >
            {responses[activePersona.name] &&
            responses[activePersona.name].length > 0 ? (
              <div className="flex flex-col space-y-2">
                {responses[activePersona.name].map((message, index) => (
                  <div
                    key={index}
                    className={`chat ${
                      message.role === "assistant" ? "chat-start" : "chat-end"
                    } group relative`}
                  >
                    {/* Edit button - only show for persona messages and not loading */}
                    {message.role === "persona" &&
                      !message.isLoading &&
                      editingIndex !== index && (
                        <button
                          onClick={() =>
                            handleEditMessage(index, activePersona)
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 transform -translate-y-1/2 p-1 bg-base-200 rounded-full hover:bg-base-300 shadow-md"
                          title="Edit message"
                        >
                          <Pencil size={16} />
                        </button>
                      )}

                    {/* Message Bubble */}
                    <div className="chat-bubble">
                      {/* Message Header */}
                      {message.role === "persona" && (
                        <strong>{activePersona.name}:</strong>
                      )}
                      {message.role === "assistant" && (
                        <strong>Chatbot:</strong>
                      )}{" "}
                      {/* Message Content - Edit Mode or Display Mode */}
                      {editingIndex === index ? (
                        <div className="mt-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="textarea textarea-bordered w-full"
                            rows={4}
                          />
                          <div className="flex justify-end space-x-2 mt-2">
                            <button
                              onClick={cancelEditing}
                              className="btn btn-sm btn-outline"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEditedMessage(activePersona)}
                              className="btn btn-sm btn-primary"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : message.isLoading ? (
                        <span className="loading loading-dots loading-md"></span>
                      ) : (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <span className="loading loading-dots loading-lg"></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
