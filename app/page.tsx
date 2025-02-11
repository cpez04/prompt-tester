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

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<Persona[]>([]);
  const [storedData, setStoredData] = useState<{ prompt: string; files: File[]; personas: Persona[] } | null>(null);

  const handleRunTest = () => {
    setStoredData({ prompt, files, personas: selectedPersonas });
  };

  return (
    <div className="container mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-6">Test Your Prompt</h1>

      {/* Prompt and File Upload Section */}
      <PromptUploader onPromptChange={setPrompt} onFilesChange={setFiles} />

      {/* Persona Selection */}
      <PersonaCarousel onPersonaSelect={setSelectedPersonas} />

      {/* Debug Button */}
      <div className="mt-6">
        <button 
          className="btn btn-primary" 
          disabled={!prompt || selectedPersonas.length === 0}
          onClick={handleRunTest}
        >
          Run Test
        </button>
      </div>

      {/* Display Stored Data for Verification */}
      {storedData && (
        <div className="mt-6 p-4 border rounded-lg shadow-md bg-base-200">
          <h2 className="text-xl font-semibold mb-2">Stored Data</h2>
          <p><strong>Prompt:</strong> {storedData.prompt}</p>
          <p><strong>Files:</strong> {storedData.files.length > 0 ? storedData.files.map(file => file.name).join(", ") : "No files uploaded"}</p>
          <p><strong>Selected Personas:</strong> {storedData.personas.map(persona => persona.name).join(", ")}</p>
        </div>
      )}
    </div>
  );
}
