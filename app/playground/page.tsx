"use client";

import { useEffect, useState, useRef, RefObject } from "react";
import PromptUploader from "@/components/PromptUploader";
import PersonaCarousel from "@/components/PersonaCarousel";
import { useRouter } from "next/navigation";
import { Persona } from "@/types";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import { MAX_TEST_RUNS } from "@/lib/constants";
import { upload } from "@vercel/blob/client";
import TutorialOverlay from "@/app/playground/TutorialOverlay";

const modelOptions = ["gpt-4o", "gpt-4o-mini", "gpt-4.1"];

const MAX_DIRECT_UPLOAD_SIZE = 4 * 1024 * 1024; // 4 MB

export default function HomePage() {
  const { user, loading: userLoading } = useUser();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<Persona[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLimit, setUserLimit] = useState(MAX_TEST_RUNS);
  const [messagesPerSide, setMessagesPerSide] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("messagesPerSide") || "5", 10);
    }
    return 5;
  });

  const router = useRouter();

  const [assistantName, setAssistantName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("assistantName") || "";
    }
    return "";
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedModel") || modelOptions[0];
    }
    return modelOptions[0];
  });

  const [personaSituationContext, setPersonaSituationContext] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("personaSituationContext") || "";
    }
    return "";
  });

  // Refs for each step
  const assistantNameRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const promptUploaderRef = useRef<HTMLDivElement>(null);
  const personaContextRef = useRef<HTMLDivElement>(null);
  const personaCarouselRef = useRef<HTMLDivElement>(null);
  const messagesPerSideRef = useRef<HTMLDivElement>(null);
  const runTestButtonRef = useRef<HTMLDivElement>(null);

  // Map ref names to actual refs (typed)
  const refMap: Record<string, RefObject<HTMLElement>> = {
    assistantNameRef: assistantNameRef as RefObject<HTMLElement>,
    modelRef: modelRef as RefObject<HTMLElement>,
    promptUploaderRef: promptUploaderRef as RefObject<HTMLElement>,
    personaContextRef: personaContextRef as RefObject<HTMLElement>,
    personaCarouselRef: personaCarouselRef as RefObject<HTMLElement>,
    messagesPerSideRef: messagesPerSideRef as RefObject<HTMLElement>,
    runTestButtonRef: runTestButtonRef as RefObject<HTMLElement>,
  };

  // Save values to localStorage when they change
  useEffect(() => {
    localStorage.setItem("assistantName", assistantName);
  }, [assistantName]);

  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("personaSituationContext", personaSituationContext);
  }, [personaSituationContext]);

  useEffect(() => {
    const fetchUserLimit = async () => {
      if (!user) return;
      try {
        const response = await fetch("/api/getUserLimit");
        if (!response.ok) {
          throw new Error("Failed to fetch user limit");
        }
        const data = await response.json();
        setUserLimit(data.maxRuns);
      } catch (error) {
        console.error("Error fetching user limit:", error);
      }
    };
    fetchUserLimit();
  }, [user]);

  useEffect(() => {
    localStorage.setItem("messagesPerSide", messagesPerSide.toString());
  }, [messagesPerSide]);

  // Show tutorial after disclaimer is accepted
  useEffect(() => {
    if (disclaimerAccepted) {
      setTimeout(() => setTutorialActive(true), 500); // slight delay after disclaimer
    }
  }, [disclaimerAccepted]);

  const uploadFileToBlob = async (file: File) => {
    const uploaded = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/blob-upload",
    });

    return uploaded;
  };

  const handleRunTest = async () => {
    setIsUploading(true);
    setShowForm(false);
    setError(null);

    try {
      // Check current number of test runs
      const response = await fetch(`/api/getUserTestRuns?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch test runs");
      }
      const data = await response.json();

      if (data.testRuns.length >= userLimit) {
        setError(
          `Maximum limit of ${userLimit} test runs reached. Please contact support to increase your limit.`,
        );
        setShowForm(true);
        setIsUploading(false);
        router.push(`/dashboard?error=max_runs_reached`);
        return;
      }

      setProcessingStep("Uploading Files");

      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.size > MAX_DIRECT_UPLOAD_SIZE) {
            const blob = await uploadFileToBlob(file);

            // Now call your OpenAI upload API with blob data
            const openaiResponse = await fetch("/api/openai-file-upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                fileUrl: blob.url,
                blobPathname: blob.pathname,
              }),
            });

            if (!openaiResponse.ok) {
              throw new Error(`Failed to upload ${file.name} to OpenAI`);
            }

            const data = await openaiResponse.json();
            return { name: file.name, id: data.file_id };
          }

          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/file-upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const data = await response.json();
          return { name: file.name, id: data.file_id };
        }),
      );

      setProcessingStep("Creating Chatbot Assistant");
      const createAssistantResponse = await fetch("/api/createAssistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: assistantName,
          model: selectedModel,
          prompt,
          uploadedFiles,
        }),
      });

      if (!createAssistantResponse.ok) {
        throw new Error("Failed to create assistant");
      }

      const assistantData = await createAssistantResponse.json();

      setProcessingStep("Creating Persona Threads");

      const threadResponses = await Promise.all(
        selectedPersonas.map(async (persona) => {
          const threadResponse = await fetch("/api/createThread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              persona,
              fileIds: uploadedFiles.map((file) => file.id),
            }),
          });

          if (!threadResponse.ok) {
            throw new Error(
              `Failed to create thread for persona: ${persona.name}`,
            );
          }

          return threadResponse.json();
        }),
      );

      setProcessingStep("Creating Chatbot Threads");

      const chatbotThreadResponses = await Promise.all(
        selectedPersonas.map(async (persona) => {
          const chatbotThreadResponse = await fetch("/api/createBotThread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileIds: uploadedFiles.map((file) => file.id),
            }),
          });

          if (!chatbotThreadResponse.ok) {
            throw new Error(
              `Failed to create chatbot thread for persona: ${persona.name}`,
            );
          }

          return chatbotThreadResponse.json();
        }),
      );

      const threads = threadResponses.map((response, index) => ({
        persona: selectedPersonas[index],
        threadId: response.thread.id,
      }));

      const chatbotThreads = chatbotThreadResponses.map((response, index) => ({
        persona: selectedPersonas[index].name,
        threadId: response.thread.id,
      }));

      setProcessingStep("Finalizing and Redirecting");

      const newStoredData = {
        prompt,
        files: uploadedFiles,
        personas: selectedPersonas,
        assistant: assistantData.assistant,
        threads,
        chatbotThreads,
        persona_situation: personaSituationContext,
        messages_per_side: messagesPerSide,
      };

      try {
        const saveResponse = await fetch("/api/saveTestData", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newStoredData),
        });

        const saveResult = await saveResponse.json();

        if (!saveResponse.ok || !saveResult.success) {
          throw new Error(saveResult.error || "Failed to save test run data");
        }

        setTimeout(() => {
          router.push(`/runTests/${saveResult.testRunId}`);
        }, 1000);
      } catch (error) {
        console.error("Failed to save test run:", error);
        setProcessingStep(
          `Error saving test run: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        setTimeout(() => {
          setShowForm(true);
          setIsUploading(false);
          setProcessingStep("");
        }, 3000);
      }
    } catch (error) {
      console.error("Error:", error);
      setProcessingStep(
        `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
      );
      setTimeout(() => {
        setShowForm(true);
        setIsUploading(false);
        setProcessingStep("");
      }, 3000);
    }
  };

  // Tutorial overlay state
  const [tutorialActive, setTutorialActive] = useState(false);

  return (
    <div className="min-h-screen bg-base-200">
      <div className="absolute top-4 right-4">
        <ProfileIcon user={user} loading={userLoading} />
      </div>
      {/* Tutorial overlay */}
      <TutorialOverlay
        active={tutorialActive}
        setActive={setTutorialActive}
        refMap={refMap}
        disclaimerAccepted={disclaimerAccepted}
      />

      {!disclaimerAccepted ? (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="max-w-xl w-full bg-base-100 p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Before You Begin</h2>
            <p className="mb-4 text-sm leading-relaxed text-base-content">
              By continuing, you agree to store the following data to improve
              and evaluate prompt performance:
            </p>
            <ul className="list-disc list-inside mb-4 text-sm text-base-content">
              <li>Your uploaded files</li>
              <li>The prompt you provide</li>
              <li>Your selected personas and their context</li>
              <li>Generated conversations and your feedback</li>
            </ul>
            <p className="mb-6 text-sm text-base-content">
              This data is stored securely and only used for testing and
              improving prompt quality.
            </p>
            <div className="text-right">
              <button
                className="btn btn-primary"
                onClick={() => setDisclaimerAccepted(true)}
              >
                I Understand and Agree
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto py-10 px-6">
          <h1 className="text-3xl font-bold mb-6">Create a Test Run</h1>

          {error && (
            <div className="alert alert-error mb-6">
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
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {showForm ? (
            <>
              {/* Assistant Name */}
              <div ref={assistantNameRef}>
                <label className="block text-sm font-medium">
                  Assistant Name
                </label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  maxLength={256}
                  className="input input-bordered w-full mb-4"
                />
              </div>

              {/* Assistant Model */}
              <div ref={modelRef}>
                <label className="block text-sm font-medium">
                  Assistant Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="select select-bordered w-full mb-4"
                >
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* PromptUploader */}
              <div ref={promptUploaderRef}>
                <PromptUploader
                  onPromptChange={setPrompt}
                  onFilesChange={setFiles}
                />
              </div>

              {/* Persona Situation Context */}
              <div className="mb-16 mt-16" ref={personaContextRef}>
                <label className="text-sm font-medium mb-1 flex items-center gap-1">
                  Persona Situation Context
                  <div
                    className="tooltip tooltip-right max-w-xs whitespace-pre-line"
                    data-tip={`Provide a short, perhaps quoted scenario that describes the environment the persona is operating in. \n    This helps ground the persona in a more realistic context during the conversation.`}
                  >
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost text-base-content/60 hover:text-base-content px-2"
                    >
                      ?
                    </button>
                  </div>
                </label>
                <textarea
                  value={personaSituationContext}
                  onChange={(e) => setPersonaSituationContext(e.target.value)}
                  className="textarea textarea-bordered w-full min-h-[120px] text-base"
                  placeholder={`e.g. "Student is preparing for a debate" or "Student is at office hours seeking help in a math course"`}
                />
              </div>

              {/* Persona Carousel */}
              <div className="mb-6" ref={personaCarouselRef}>
                <PersonaCarousel onPersonaSelect={setSelectedPersonas} />
              </div>

              {/* Messages per Side */}
              <div className="mb-6" ref={messagesPerSideRef}>
                <label
                  htmlFor="messagesPerSide"
                  className="text-sm font-medium mb-2 flex items-center gap-1"
                >
                  Messages per Side: {messagesPerSide}
                  <div
                    className="tooltip tooltip-right max-w-xs whitespace-pre-line"
                    data-tip="Number of messages each persona and the assistant will exchange (3-10)."
                  >
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost text-base-content/60 hover:text-base-content px-2"
                    >
                      ?
                    </button>
                  </div>
                </label>
                <div className="flex items-center max-w-xs">
                  <span className="mr-2">3</span>
                  <input
                    id="messagesPerSide"
                    type="range"
                    className="range range-sm w-full"
                    min="3"
                    max="10"
                    value={messagesPerSide}
                    onChange={(e) =>
                      setMessagesPerSide(parseInt(e.target.value, 10))
                    }
                  />
                  <span className="ml-2">10</span>
                </div>
              </div>

              {/* Run Test Button */}
              <div className="mt-6 flex justify-end" ref={runTestButtonRef}>
                <button
                  className="btn btn-primary"
                  disabled={
                    !prompt ||
                    selectedPersonas.length === 0 ||
                    isUploading ||
                    !assistantName ||
                    !personaSituationContext.trim()
                  }
                  onClick={handleRunTest}
                >
                  {isUploading ? "Processing..." : "Run Test"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="card w-full max-w-md bg-base-200 shadow-xl">
                <div className="card-body items-center text-center">
                  <h2 className="card-title mb-4">Processing Your Request</h2>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`loading loading-dots loading-md ${processingStep.includes("Error") ? "text-error" : "text-primary"}`}
                    ></span>
                    <span className="text-lg font-medium">
                      {processingStep}
                    </span>
                  </div>
                  {processingStep.includes("Error") && (
                    <button
                      onClick={() => {
                        setShowForm(true);
                        setIsUploading(false);
                        setProcessingStep("");
                      }}
                      className="btn btn-error mt-4"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
