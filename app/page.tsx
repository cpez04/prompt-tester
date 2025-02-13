"use client";

import { useState } from "react";
import PromptUploader from "@/components/PromptUploader";
import PersonaCarousel from "@/components/PersonaCarousel";

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
    assistant?: { id: string; name: string; description: string; model: string };
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [assistantName, setAssistantName] = useState("");
  const [assistantDescription, setAssistantDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);

 
  const handleRunTest = async () => {
    setIsUploading(true);

    try {
      // Upload each file and store its returned file ID
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

        // Create the assistant after files are uploaded
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



    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-6">Test Your Prompt</h1>

      {/* Assistant Name */}
      <label className="block text-sm font-medium ">Assistant Name</label>
      <input
        type="text"
        value={assistantName}
        onChange={(e) => setAssistantName(e.target.value)}
        maxLength={256}
        className="input input-bordered w-full mb-4"
      />

      {/* Assistant Description */}
      <label className="block text-sm font-medium ">Assistant Description</label>
      <textarea
        value={assistantDescription}
        onChange={(e) => setAssistantDescription(e.target.value)}
        maxLength={512}
        className="textarea textarea-bordered w-full mb-4"
      ></textarea>

      {/* Assistant Model Selection */}
      <label className="block text-sm font-medium text-gray-700">Assistant Model</label>
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="select select-bordered w-full mb-4"
      >
        {modelOptions.map((model) => (
          <option key={model} value={model}>{model}</option>
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
          disabled={!prompt || selectedPersonas.length === 0 || isUploading || !assistantName}
          onClick={handleRunTest}
        >
          {isUploading ? "Processing..." : "Run Test"}
        </button>
      </div>

      {/* Display Stored Data for Verification */}
      {storedData && (
        <div className="mt-6 p-4 border rounded-lg shadow-md bg-base-200">
          <h2 className="text-xl font-semibold mb-2">Stored Data</h2>
          <p><strong>Prompt:</strong> {storedData.prompt}</p>
          <p><strong>Files:</strong> {storedData.files.length > 0 ? storedData.files.map(file => `${file.name} (ID: ${file.id})`).join(", ") : "No files uploaded"}</p>
          <p><strong>Selected Personas:</strong> {storedData.personas.map(persona => persona.name).join(", ")}</p>
          {storedData.assistant && (
            <>
              <h2 className="text-xl font-semibold mt-4">Assistant Info</h2>
              <p><strong>ID:</strong> {storedData.assistant.id}</p>
              <p><strong>Name:</strong> {storedData.assistant.name}</p>
              <p><strong>Description:</strong> {storedData.assistant.description}</p>
              <p><strong>Model:</strong> {storedData.assistant.model}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
