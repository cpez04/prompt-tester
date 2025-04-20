"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ExportChatsModal from "@/components/ExportChatsModal";
import ReactMarkdown from "react-markdown";
import { Pencil, RefreshCw } from "lucide-react";
import JSZip from "jszip";
import { Persona, Message } from "@/types";
import { MAX_MESSAGES_PER_SIDE } from "@/lib/constants";

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

export default function RunTestsClient({ testRunId }: { testRunId: string }) {
  const router = useRouter();
  const [testRunData, setTestRunData] = useState<TestRunData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTestRun = async () => {
      try {
        const res = await fetch(`/api/getTestRun?testRunId=${testRunId}`);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            // Unauthorized or forbidden - redirect to playground
            router.push("/playground");
            return;
          }
          throw new Error("Failed to fetch test run");
        }
        const data = await res.json();
        setTestRunData(data);
        // Set the first persona as active by default
        if (data.personasOnRun && data.personasOnRun.length > 0) {
          setActivePersona(data.personasOnRun[0].persona);
        }
        setLoading(false);
      } catch (err) {
        console.log("Error loading test run:", err);
        router.push("/playground");
      }
    };
    loadTestRun();
  }, [testRunId, router]);

  console.log("Test Run Data:", testRunData);

  const [responses, setResponses] = useState<Record<string, Message[]>>({});
  const [activePersona, setActivePersona] = useState<Persona | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const lastScrollHeight = useRef(0);
  const isStreaming = useRef(false);
  const userScrollPosition = useRef(0);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [regenerationConfirmOpen, setRegenerationConfirmOpen] = useState(false);
  const [personaToRegenerate, setPersonaToRegenerate] =
    useState<Persona | null>(null);

  // New states for message editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messageDimensions, setMessageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Create a ref to store the conversation flow functions
  const conversationFlowRef = useRef<{
    getChatbotResponse: (
      chatbotThread: string,
      persona: Persona,
      message: string,
      messageCount: number,
    ) => Promise<void>;
    startStreaming: (
      threadId: string,
      persona: Persona,
      lastChatbotMessage: string,
      messageCount: number,
    ) => Promise<void>;
  }>({
    getChatbotResponse: async () => {},
    startStreaming: async () => {},
  });

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

  const hasFinishedMessages = useCallback(() => {
    // Check if all personas have completed their conversations
    return (
      testRunData?.personasOnRun.every(({ persona }) =>
        isConversationComplete(persona.name),
      ) || false
    );
  }, [testRunData, isConversationComplete]);

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

  // Define getChatbotResponse without depending on startStreaming
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

        if (!testRunData?.assistantId) return;

        const response = await fetch("/api/generateResponse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            assistantId: testRunData.assistantId,
            threadId: chatbotThread,
            files: testRunData.files,
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

        // Save the message to the database
        const chatbotThreadId = testRunData?.chatbotThreads.find(
          (ct) => ct.personaName === persona.name,
        )?.chatbotThreadId;

        if (chatbotThreadId) {
          const res = await fetch("/api/saveMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "assistant",
              content: accumulatedMessage,
              chatbotThreadId,
            }),
          });

          const { message } = await res.json();

          setResponses((prev) => {
            const updatedMessages = [...(prev[persona.name] || [])];
            updatedMessages[updatedMessages.length - 1] = {
              role: "assistant",
              content: accumulatedMessage,
              isLoading: false,
              createdAt: message.createdAt,
            };
            return { ...prev, [persona.name]: updatedMessages };
          });
        }

        if (!testRunData?.personasOnRun) return;

        const threadId = testRunData.personasOnRun.find(
          (t) => t.persona.name === persona.name,
        )?.threadId;

        if (threadId) {
          console.log(
            `Starting streaming for ${persona.name} with threadId: ${threadId}`,
          );
          setTimeout(
            () =>
              conversationFlowRef.current.startStreaming(
                threadId,
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
    [testRunData, setResponses],
  );

  // Define startStreaming without depending on getChatbotResponse
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

        if (!testRunData?.assistantId) return;

        const response = await fetch("/api/createRun", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assistantId: testRunData.assistantId,
            threadId,
            lastChatbotMessage,
            persona,
            personaContext: testRunData.personaContext,
            files: testRunData.files,
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

        const personaOnRunId = testRunData.personasOnRun.find(
          (t) => t.persona.name === persona.name,
        )?.personaOnRunId;

        if (personaOnRunId) {
          const res = await fetch("/api/saveMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "persona",
              content: accumulatedMessage,
              personaOnRunId,
            }),
          });

          const { message } = await res.json();

          setResponses((prev) => {
            const updatedMessages = [...(prev[persona.name] || [])];
            updatedMessages[updatedMessages.length - 1] = {
              role: "persona",
              content: accumulatedMessage,
              isLoading: false,
              createdAt: message.createdAt,
            };
            return { ...prev, [persona.name]: updatedMessages };
          });
        }

        const chatbotThreadId = testRunData?.chatbotThreads.find(
          (ct) => ct.personaName === persona.name,
        )?.threadId;

        if (chatbotThreadId) {
          console.log("Triggering chatbot response for persona:", persona.name);
          setTimeout(
            () =>
              conversationFlowRef.current.getChatbotResponse(
                chatbotThreadId,
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
    [testRunData, setResponses],
  );

  // Update the ref with the latest functions
  useEffect(() => {
    conversationFlowRef.current = {
      getChatbotResponse,
      startStreaming,
    };
  }, [getChatbotResponse, startStreaming]);

  const handleEditMessage = (index: number, persona: Persona) => {
    const messages = responses[persona.name] || [];
    const targetMessage = messages[index];

    if (targetMessage?.role === "persona") {
      // Capture the dimensions of the original message
      const messageElement = messageRefs.current[index];
      if (messageElement) {
        setMessageDimensions({
          width: messageElement.offsetWidth,
          height: messageElement.offsetHeight,
        });
      }

      setEditingIndex(index);
      setEditContent(targetMessage.content);
    }
  };

  const saveEditedMessage = async (persona: Persona) => {
    console.log("Saving edited message:", editContent);
    if (editingIndex === null || !testRunData) return;

    const personaName = persona.name;
    const allMessages = responses[personaName] || [];
    const editedMessage = allMessages[editingIndex];
    const editedCreatedAt = editedMessage.createdAt;

    const personaOnRunId = testRunData.personasOnRun.find(
      (t) => t.persona.name === personaName,
    )?.personaOnRunId;

    const openai_chatbotid = testRunData.chatbotThreads.find(
      (ct) => ct.personaName === personaName,
    )?.threadId;

    const db_chatbotid = testRunData.chatbotThreads.find(
      (ct) => ct.personaName === personaName,
    )?.chatbotThreadId;

    console.log("PersonaOnRunId:", personaOnRunId);
    console.log("Chatbot OPENAI ThreadId:", openai_chatbotid);
    console.log("EditedCreatedAt:", editedCreatedAt);
    console.log("Edited message:", editedMessage);

    if (!personaOnRunId || !openai_chatbotid || !editedCreatedAt) return;

    // Step 1: Delete messages after the edited one (inclusive)
    try {
      await fetch("/api/deleteMessagesAfterIndex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaOnRunId,
          db_chatbotid,
          editedCreatedAt,
        }),
      });
    } catch (err) {
      console.error("❌ Failed to delete following messages after edit:", err);
    }

    const newMessages: Message[] = [
      ...allMessages.slice(0, editingIndex),
      {
        role: "persona",
        content: editContent,
        isLoading: false, // optional, but good to be explicit
      },
    ];

    setResponses((prev) => ({
      ...prev,
      [personaName]: newMessages,
    }));

    const res = await fetch("/api/saveMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "persona",
        content: editContent,
        personaOnRunId,
      }),
    });

    const { message } = await res.json();

    const finalMessages: Message[] = [
      ...allMessages.slice(0, editingIndex),
      {
        role: "persona",
        content: editContent,
        isLoading: false,
        createdAt: message.createdAt,
      },
    ];

    setResponses((prev) => ({
      ...prev,
      [personaName]: finalMessages,
    }));

    // Step 3: Trigger chatbot response for the edited message
    if (openai_chatbotid) {
      setTimeout(() => {
        conversationFlowRef.current.getChatbotResponse(
          openai_chatbotid,
          persona,
          editContent,
          editingIndex + 1,
        );
      }, 500);
    }

    // Reset editing state
    setEditingIndex(null);
    setEditContent("");
    setMessageDimensions(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingIndex(null);
    setEditContent("");
    setMessageDimensions(null);
  };

  // New function to handle regeneration request
  const handleRegenerateRequest = (persona: Persona) => {
    setPersonaToRegenerate(persona);
    setRegenerationConfirmOpen(true);
  };

  // New function to regenerate entire conversation
  const regenerateConversation = async () => {
    if (
      !personaToRegenerate ||
      !testRunData?.personasOnRun ||
      !testRunData?.chatbotThreads
    )
      return;

    const thread = testRunData.personasOnRun.find(
      (t) => t.persona.name === personaToRegenerate.name,
    );

    const threadId = thread?.threadId;

    const initialQuestion = thread?.persona.initialQuestion;
    const personaOnRunId = thread?.personaOnRunId;

    const chatbotThreadId = testRunData.chatbotThreads.find(
      (ct) => ct.personaName === personaToRegenerate.name,
    )?.chatbotThreadId;

    try {
      await fetch("/api/deleteMessages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaOnRunId,
          chatbotThreadId,
        }),
      });
    } catch (error) {
      console.error("❌ Failed to delete conversation messages:", error);
    }

    // Reset local stage
    setResponses((prev) => ({
      ...prev,
      [personaToRegenerate.name]: [],
    }));

    // Step 3a: If there is an initial question, save it and trigger chatbot response
    if (initialQuestion?.trim() && personaOnRunId && threadId) {
      try {
        const res = await fetch("/api/saveMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "persona",
            content: initialQuestion,
            personaOnRunId,
          }),
        });

        const { message } = await res.json();

        setResponses((prev) => ({
          ...prev,
          [personaToRegenerate.name]: [
            {
              role: "persona",
              content: initialQuestion,
              isLoading: false,
              createdAt: message.createdAt,
            },
          ],
        }));

        // Trigger chatbot response using the ref
        conversationFlowRef.current.getChatbotResponse(
          threadId,
          personaToRegenerate,
          initialQuestion,
          1,
        );
      } catch (err) {
        console.error(
          "❌ Failed to save or trigger initial chatbot response:",
          err,
        );
      }
    }

    // Step 3b: No initial question — start with persona streaming
    else if (threadId) {
      conversationFlowRef.current.startStreaming(
        threadId,
        personaToRegenerate,
        "",
        0,
      );
    }

    // Step 4: Cleanup state
    setRegenerationConfirmOpen(false);
    setPersonaToRegenerate(null);
  };

  useEffect(() => {
    if (!testRunData || hasRun.current) return;

    testRunData.personasOnRun.forEach(
      ({ persona, threadId, personaOnRunId }) => {
        if (persona.initialQuestion?.trim()) {
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

          const saveInitialMessage = async () => {
            const res = await fetch("/api/saveMessage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: "persona",
                content: persona.initialQuestion!,
                personaOnRunId,
              }),
            });

            const { message } = await res.json();

            setResponses((prev) => ({
              ...prev,
              [persona.name]: [
                {
                  role: "persona",
                  content: persona.initialQuestion!,
                  isLoading: false,
                  createdAt: message.createdAt,
                },
              ],
            }));
          };

          saveInitialMessage();

          const chatbotThread = testRunData.chatbotThreads.find(
            (ct) => ct.personaName === persona.name,
          )?.threadId;

          if (chatbotThread) {
            setTimeout(() => {
              conversationFlowRef.current.getChatbotResponse(
                chatbotThread,
                persona,
                persona.initialQuestion!,
                1,
              );
            }, 500);
          }
        } else {
          // Fallback: start persona streaming
          conversationFlowRef.current.startStreaming(threadId, persona, "", 0);
        }
      },
    );

    hasRun.current = true;
  }, [testRunData]);

  // Update streaming state when messages are being updated
  useEffect(() => {
    const messages = responses[activePersona?.name || ""] || [];
    const lastMessage = messages[messages.length - 1];
    isStreaming.current = lastMessage?.isLoading || false;
  }, [responses, activePersona]);

  // Handle scroll events to detect if user has scrolled up
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      userScrollPosition.current = scrollTop;

      // Consider user scrolled up if they're more than 200px from bottom
      setIsUserScrolledUp(distanceFromBottom > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle scroll behavior
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const currentScrollHeight = container.scrollHeight;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      10;

    // Only auto-scroll if:
    // 1. We're at the bottom and streaming
    // 2. We're at the bottom and new content was added
    // 3. The user hasn't scrolled up and new content was added
    if (
      (isAtBottom && isStreaming.current) ||
      (isAtBottom && currentScrollHeight > lastScrollHeight.current) ||
      (!isUserScrolledUp &&
        currentScrollHeight > lastScrollHeight.current &&
        isStreaming.current)
    ) {
      container.scrollTop = container.scrollHeight;
    }

    lastScrollHeight.current = currentScrollHeight;
  }, [responses, activePersona, isUserScrolledUp]);

  // Reset scroll position when switching personas
  useEffect(() => {
    if (chatContainerRef.current) {
      setIsUserScrolledUp(false);
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [activePersona]);

  const handleEvaluateChats = () => {
    if (!testRunData?.id) return;
    router.push(`/evaluateChats/${testRunData.id}`);
  };

  // Loading state
  if (loading || !testRunData) {
    return <p className="text-center text-lg">Loading...</p>;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-base-200">
      {/* Persona Selection Row */}
      <div className="w-full flex justify-between items-center bg-base-300 p-3">
        {/* Persona Buttons */}
        <div className="flex space-x-2">
          {testRunData.personasOnRun.map(({ persona }) => {
            const messages = responses[persona.name] || [];
            const completedMessages = messages.filter(
              (msg) => !msg.isLoading,
            ).length;
            const progressValue =
              (completedMessages / (MAX_MESSAGES_PER_SIDE * 2)) * 100;

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
                      : progressValue < 100
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

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            className="btn btn-sm btn-accent"
            onClick={() => setExportModalOpen(true)}
            disabled={!hasFinishedMessages()}
          >
            Export Chats
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleEvaluateChats}
            disabled={!hasFinishedMessages()}
          >
            Evaluate Chats
          </button>
        </div>
      </div>

      {/* Export Modal */}
      <ExportChatsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        personas={testRunData.personasOnRun.map((p) => p.persona)}
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
            <button
              onClick={() => handleRegenerateRequest(activePersona)}
              className="btn btn-sm btn-ghost btn-circle ml-2"
              title="Regenerate conversation"
            >
              <RefreshCw size={16} />
            </button>
          </h2>

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
                    } group relative flex items-center ${
                      message.role === "assistant"
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    {message.role === "persona" &&
                      !message.isLoading &&
                      editingIndex !== index && (
                        <button
                          onClick={() =>
                            handleEditMessage(index, activePersona)
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-base-200 rounded-full hover:bg-base-300 shadow-md z-10 ml-2"
                          title="Edit message"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    <div
                      className={`chat-bubble break-words whitespace-pre-wrap max-w-full ${
                        message.role === "assistant"
                          ? "bg-primary/10 text-base-content"
                          : "bg-secondary/10 text-base-content"
                      }`}
                      style={{ maxWidth: "80%" }}
                    >
                      {message.role === "persona" && (
                        <strong>{activePersona.name}:</strong>
                      )}
                      {message.role === "assistant" && (
                        <strong>Chatbot:</strong>
                      )}{" "}
                      {editingIndex === index ? (
                        <div className="w-full">
                          <div
                            className="w-full"
                            style={
                              messageDimensions
                                ? {
                                    width: `${messageDimensions.width}px`,
                                    height: `${messageDimensions.height}px`,
                                  }
                                : undefined
                            }
                          >
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="textarea w-full h-full bg-transparent border-none focus:outline-none resize-none p-0"
                              autoFocus
                            />
                          </div>
                          <div className="flex justify-end space-x-2 mt-2 mb-8">
                            <button
                              onClick={cancelEditing}
                              className="btn btn-xs btn-outline"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEditedMessage(activePersona)}
                              className="btn btn-xs btn-primary"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : message.isLoading ? (
                        <span className="loading loading-dots loading-md"></span>
                      ) : (
                        <div
                          ref={(el) => {
                            messageRefs.current[index] = el;
                          }}
                        >
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
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
