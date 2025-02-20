"use client";

import { useState } from "react";
import PromptUploader from "@/components/PromptUploader";
import PersonaCarousel from "@/components/PersonaCarousel";
import { useRouter } from "next/navigation";

interface Persona {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
}

const modelOptions = ["gpt-4o-mini"];

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<Persona[]>([]);
  const [storedData, setStoredData] = useState<{
    prompt: string;
    files: { name: string; id: string }[];
    personas: Persona[];
    assistant?: {
      id: string;
      name: string;
      description: string;
      model: string;
    };
    chatbotThread?: { persona: string; threadId: string };
    threads?: { persona: Persona; threadId: string }[];
    testRun?: { persona: Persona; threadId: string };
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [assistantName, setAssistantName] = useState("");
  const [assistantDescription, setAssistantDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [showForm, setShowForm] = useState(true);

  const router = useRouter();

  const handleRunTest = async () => {
    setIsUploading(true);
    setShowForm(false);

    try {
      setProcessingStep("Uploading Files");

      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
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
          description: assistantDescription,
          model: selectedModel,
          prompt,
          uploadedFiles,
        }),
      });

      console.log("Assistant creation response:", createAssistantResponse);

      if (!createAssistantResponse.ok) {
        throw new Error("Failed to create assistant");
      }

      const assistantData = await createAssistantResponse.json();
      setStoredData({
        prompt,
        files: uploadedFiles,
        personas: selectedPersonas,
        assistant: assistantData.assistant,
      });

      // Creating persona threads step
      setProcessingStep("Creating Persona Threads");
      // Create a thread for each persona and attach the uploaded file IDs
      const threadResponses = await Promise.all(
        selectedPersonas.map(async (persona) => {
          const threadResponse = await fetch("/api/createThread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              persona,
              fileIds: uploadedFiles.map((file) => file.id), // Attach file IDs to thread
            }),
          });

          if (!threadResponse.ok) {
            throw new Error(`Failed to create thread for persona: ${persona}`);
          }

          return threadResponse.json();
        }),
      );

      // Creating chatbot threads step
      setProcessingStep("Creating Chatbot Threads");
      // Create chatbot threads for each persona
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

      // Extract thread IDs from the responses
      const threads = threadResponses.map((response, index) => ({
        persona: selectedPersonas[index],
        threadId: response.thread.id,
      }));

      // Extract chatbot thread IDs
      const chatbotThreads = chatbotThreadResponses.map((response, index) => ({
        persona: selectedPersonas[index].name,
        threadId: response.thread.id,
      }));

      console.log("Threads created:", threads);
      console.log("Chatbot threads created:", chatbotThreads);

      // Finalizing step
      setProcessingStep("Finalizing and Redirecting");

      const newStoredData = {
        prompt,
        files: uploadedFiles,
        personas: selectedPersonas,
        assistant: assistantData.assistant,
        threads,
        chatbotThreads,
      };
      setStoredData(newStoredData);

      localStorage.setItem("storedData", JSON.stringify(newStoredData));

      setTimeout(() => {
        router.push("/runTests");
      }, 1000);
    } catch (error) {
      console.error("Error:", error);
      setProcessingStep(
        `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
      );
      // Give user option to try again
      setTimeout(() => {
        setShowForm(true);
        setIsUploading(false);
        setProcessingStep("");
      }, 3000);
    }
  };

  return (
    <div className="container mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-6">Test Your Prompt</h1>

      {showForm ? (
        <>
          {/* Assistant Name */}
          <label className="block text-sm font-medium">Assistant Name</label>
          <input
            type="text"
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
            maxLength={256}
            className="input input-bordered w-full mb-4"
          />

          {/* Assistant Description */}
          <label className="block text-sm font-medium">
            Assistant Description
          </label>
          <textarea
            value={assistantDescription}
            onChange={(e) => setAssistantDescription(e.target.value)}
            maxLength={512}
            className="textarea textarea-bordered w-full mb-4"
          ></textarea>

          {/* Assistant Model Selection */}
          <label className="block text-sm font-medium">Assistant Model</label>
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

          {/* Prompt and File Upload Section */}
          <PromptUploader onPromptChange={setPrompt} onFilesChange={setFiles} />

          {/* Persona Selection */}
          <PersonaCarousel onPersonaSelect={setSelectedPersonas} />

          {/* Run Test Button */}
          <div className="mt-6">
            <button
              className="btn btn-primary"
              disabled={
                !prompt ||
                selectedPersonas.length === 0 ||
                isUploading ||
                !assistantName
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
                <span className="text-lg font-medium">{processingStep}</span>
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
  );
}
