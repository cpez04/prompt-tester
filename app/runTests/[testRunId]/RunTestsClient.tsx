"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ExportChatsModal from "@/components/ExportChatsModal";
import ReactMarkdown from "react-markdown";
import { Pencil, RefreshCw } from "lucide-react";
import JSZip from "jszip";
import { Persona, Message } from "@/types";

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
  messagesPerSide: number;
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

        // Check if messagesPerSide is missing
        if (typeof data.messagesPerSide !== "number") {
          console.error("Missing messagesPerSide value");
          router.push("/dashboard");
          return;
        }

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

  const [responses, setResponses] = useState<Record<string, Message[]>>({});
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [isSwitchingPersona, setIsSwitchingPersona] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
        messages.length === (testRunData?.messagesPerSide || 5) * 2 &&
        messages.every((msg) => !msg.isLoading)
      );
    },
    [responses, testRunData],
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
      if (messageCount >= (testRunData?.messagesPerSide || 5) * 2) return; // Stop if we reached the limit

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
      if (messageCount >= (testRunData?.messagesPerSide || 5) * 2) return; // Stop if we reached the limit

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

    testRunData.personasOnRun.forEach(({ persona, personaOnRunId }) => {
      const personaMessages =
        testRunData.personasOnRun.find((p) => p.persona.id === persona.id)
          ?.messages || [];
      const chatbotMessages =
        testRunData.chatbotThreads.find((c) => c.personaName === persona.name)
          ?.messages || [];

      // Combine persona + chatbot messages
      let combinedMessages = [...personaMessages, ...chatbotMessages].sort(
        (a, b) =>
          new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime(),
      );

      // ⚡ If there are no messages yet, and persona has an initialQuestion
      if (combinedMessages.length === 0 && persona.initialQuestion?.trim()) {
        combinedMessages = [
          {
            role: "persona",
            content: persona.initialQuestion,
            isLoading: false,
            createdAt: new Date().toISOString(), // Temporary, just to order
          },
        ];

        // Save initialQuestion into database
        fetch("/api/saveMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "persona",
            content: persona.initialQuestion,
            personaOnRunId,
          }),
        }).then(async (res) => {
          const { message } = await res.json();
          // Update with real createdAt after saving
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
        });
      }

      // Set loaded (or new) messages
      setResponses((prev) => ({
        ...prev,
        [persona.name]: combinedMessages,
      }));

      const messageCount = combinedMessages.length;

      if (messageCount < (testRunData.messagesPerSide || 5) * 2) {
        const lastMessage = combinedMessages[combinedMessages.length - 1];
        const threadId = testRunData.personasOnRun.find(
          (p) => p.persona.id === persona.id,
        )?.threadId;

        const chatbotThreadId = testRunData.chatbotThreads.find(
          (c) => c.personaName === persona.name,
        )?.threadId;

        if (lastMessage?.role === "persona") {
          if (chatbotThreadId) {
            setTimeout(() => {
              conversationFlowRef.current.getChatbotResponse(
                chatbotThreadId,
                persona,
                lastMessage.content,
                messageCount,
              );
            }, 500);
          }
        } else if (lastMessage?.role === "assistant") {
          if (threadId) {
            setTimeout(() => {
              conversationFlowRef.current.startStreaming(
                threadId,
                persona,
                lastMessage.content,
                messageCount,
              );
            }, 500);
          }
        } else {
          // Fallback
          if (threadId) {
            setTimeout(() => {
              conversationFlowRef.current.startStreaming(
                threadId,
                persona,
                "",
                0,
              );
            }, 500);
          }
        }
      }
    });

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

  const handlePersonaSwitch = (persona: Persona) => {
    if (isSwitchingPersona) return;
    setIsSwitchingPersona(true);
    setActivePersona(persona);
    setTimeout(() => setIsSwitchingPersona(false), 50);
  };

  // Loading state
  if (loading || !testRunData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg font-medium text-base-content/80">
            Loading test run...
          </p>
        </div>
      </div>
    );
  }

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
            {testRunData.personasOnRun.map(({ persona }) => {
              const messages = responses[persona.name] || [];
              const completedMessages = messages.filter(
                (msg) => !msg.isLoading,
              ).length;
              const progressValue =
                (completedMessages /
                  ((testRunData?.messagesPerSide || 5) * 2)) *
                100;

              const isActive =
                activePersona?.id === persona.id && !isSwitchingPersona;

              return (
                <div key={persona.id} className="flex flex-col">
                  <button
                    onClick={() => handlePersonaSwitch(persona)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-base-200 text-base-content/80"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        isActive ? "bg-primary" : "bg-base-content/40"
                      }`}
                    />
                    <span className="text-sm font-medium truncate transition-colors duration-300">
                      {persona.name}
                    </span>
                    <div className="ml-auto text-xs text-base-content/60 transition-colors duration-300">
                      {completedMessages}/
                      {(testRunData?.messagesPerSide || 5) * 2}
                    </div>
                  </button>
                  <progress
                    className={`progress w-full mt-1 h-1 transition-colors duration-300 ${
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

          {/* Action Buttons at the bottom */}
          <div className="mt-auto pt-4 flex flex-col space-y-2">
            <button
              className="btn btn-sm btn-accent shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => setExportModalOpen(true)}
              disabled={!hasFinishedMessages()}
            >
              Export Chats
            </button>
            <button
              className="btn btn-sm btn-secondary shadow-sm hover:shadow-md transition-all duration-200"
              onClick={handleEvaluateChats}
              disabled={!hasFinishedMessages()}
            >
              Evaluate Chats
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "ml-0" : "ml-64"
        }`}
      >
        {activePersona && (
          <div className="flex flex-col flex-grow p-6">
            <div className="w-full max-w-6xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-semibold text-base-content">
                  {activePersona.name}&apos;s Conversation
                </h2>
                <button
                  onClick={() => handleRegenerateRequest(activePersona)}
                  className="btn btn-sm btn-ghost btn-circle hover:bg-base-300 transition-colors duration-200"
                  title="Regenerate conversation"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <div
                ref={chatContainerRef}
                className="flex flex-col w-full bg-base-100 rounded-lg border shadow-lg p-6 max-h-[calc(100vh-6rem)] overflow-y-auto"
              >
                {responses[activePersona.name] &&
                responses[activePersona.name].length > 0 ? (
                  <div className="flex flex-col space-y-4">
                    {responses[activePersona.name].map((message, index) => (
                      <div
                        key={index}
                        className={`chat ${
                          message.role === "assistant"
                            ? "chat-start"
                            : "chat-end"
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
                              className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 bg-base-200 rounded-full hover:bg-base-300 shadow-md z-10 ml-2 hover:scale-110"
                              title="Edit message"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        <div
                          className={`chat-bubble break-words whitespace-pre-wrap max-w-full transition-all duration-200 ${
                            message.role === "assistant"
                              ? "bg-primary/10 text-base-content hover:bg-primary/15"
                              : "bg-secondary/10 text-base-content hover:bg-secondary/15"
                          }`}
                          style={{ maxWidth: "80%" }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.role === "persona" && (
                              <strong className="text-sm font-medium text-base-content/80">
                                {activePersona.name}
                              </strong>
                            )}
                            {message.role === "assistant" && (
                              <strong className="text-sm font-medium text-base-content/80">
                                Chatbot
                              </strong>
                            )}
                          </div>
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
                                  onChange={(e) =>
                                    setEditContent(e.target.value)
                                  }
                                  className="textarea w-full h-full bg-transparent border-none focus:outline-none resize-none p-0"
                                  autoFocus
                                />
                              </div>
                              <div className="flex justify-end space-x-2 mt-2 mb-8">
                                <button
                                  onClick={cancelEditing}
                                  className="btn btn-xs btn-outline hover:bg-base-200 transition-colors duration-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() =>
                                    saveEditedMessage(activePersona)
                                  }
                                  className="btn btn-xs btn-primary hover:bg-primary-focus transition-colors duration-200"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : message.isLoading ? (
                            <div className="flex items-center gap-2">
                              <span className="loading loading-dots loading-sm"></span>
                            </div>
                          ) : (
                            <div
                              ref={(el) => {
                                messageRefs.current[index] = el;
                              }}
                              className="prose prose-sm max-w-none"
                            >
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <div className="flex flex-col items-center gap-4">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                      <p className="text-lg font-medium text-base-content/80">
                        Starting conversation with {activePersona.name}...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
    </div>
  );
}
