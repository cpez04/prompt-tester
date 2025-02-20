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
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [assistantDescription, setAssistantDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);

  const router = useRouter();

  const handleRunTest = async () => {
    setIsUploading(true);
    setStatusMessage("Uploading files...");

    try {
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
        })
      );

      setStatusMessage("Creating assistant...");

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

      if (!createAssistantResponse.ok) {
        throw new Error("Failed to create assistant");
      }

      setStatusMessage("Creating persona threads...");

      await Promise.all(
        selectedPersonas.map(async (persona) => {
          const threadResponse = await fetch("/api/createThread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ persona, fileIds: uploadedFiles.map((file) => file.id) }),
          });

          if (!threadResponse.ok) {
            throw new Error(`Failed to create thread for ${persona.name}`);
          }
        })
      );

      setStatusMessage("Finalizing setup...");
      
      setTimeout(() => {
        router.push("/runTests");
      }, 100);
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="container mx-auto py-10 px-6">
      {isUploading ? (
        <div className="flex flex-col items-start justify-center min-h-[50vh]">
          <span className="loading loading-dots loading-lg mb-4"></span>
          <p className="text-lg font-medium">{statusMessage}</p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">Test Your Prompt</h1>

          <label className="block text-sm font-medium">Assistant Name</label>
          <input
            type="text"
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
            maxLength={256}
            className="input input-bordered w-full mb-4"
          />

          <label className="block text-sm font-medium">Assistant Description</label>
          <textarea
            value={assistantDescription}
            onChange={(e) => setAssistantDescription(e.target.value)}
            maxLength={512}
            className="textarea textarea-bordered w-full mb-4"
          ></textarea>

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

          <PromptUploader onPromptChange={setPrompt} onFilesChange={setFiles} />
          <PersonaCarousel onPersonaSelect={setSelectedPersonas} />

          <div className="mt-6">
            <button
              className="btn btn-primary"
              disabled={!prompt || selectedPersonas.length === 0 || isUploading || !assistantName}
              onClick={handleRunTest}
            >
              Run Test
            </button>
          </div>
        </>
      )}
    </div>
  );
}