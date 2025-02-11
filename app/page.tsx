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

  return (
    <div className="container mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-6">Test Your Prompt</h1>

      {/* Prompt and File Upload Section */}
      <PromptUploader onPromptChange={setPrompt} onFilesChange={setFiles} />

      {/* Persona Selection */}
      <PersonaCarousel onPersonaSelect={setSelectedPersonas} />

      {/* Debug Button */}
      <div className="mt-6">
        <button className="btn btn-primary" disabled={!prompt || selectedPersonas.length === 0}>
          Run Test
        </button>
      </div>
    </div>
  );
}
