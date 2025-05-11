"use client";

import { useState, useEffect } from "react";
import { Persona } from "@/types";

export default function PersonaEditor({
  persona,
  onClose,
  onSave,
  onDelete,
}: {
  persona: Persona;
  onClose: () => void;
  onSave: (persona: Persona) => void;
  onDelete: (personaId: string) => void;
}) {
  const [editedPersona, setEditedPersona] = useState<Persona>({
    ...persona,
    followUpQuestions: persona.followUpQuestions || Array(4).fill("")
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [playgroundPrompt, setPlaygroundPrompt] = useState("");
  const [personaContext, setPersonaContext] = useState("");

  useEffect(() => {
    // Load values from localStorage
    const storedPrompt = localStorage.getItem("prompt") || "";
    const storedContext = localStorage.getItem("personaSituationContext") || "";
    setPlaygroundPrompt(storedPrompt);
    setPersonaContext(storedContext);
  }, []);

  const canGenerateSuggestions = editedPersona.name && editedPersona.description && editedPersona.defaultPrompt;

  const generateSuggestions = async () => {
    if (!canGenerateSuggestions) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generatePersonaQuestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editedPersona.name,
          description: editedPersona.description,
          defaultPrompt: editedPersona.defaultPrompt,
          playgroundPrompt,
          personaContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate suggestions");
      }

      const data = await response.json();
      
      // Update the persona with all questions
      setEditedPersona({
        ...editedPersona,
        initialQuestion: data.initialQuestion,
        followUpQuestions: data.followUpQuestions
      });
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFollowUpChange = (index: number, value: string) => {
    const newFollowUps = [...(editedPersona.followUpQuestions || [])];
    newFollowUps[index] = value;
    setEditedPersona({
      ...editedPersona,
      followUpQuestions: newFollowUps
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-base-200 border border-base-300 p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-base-content mb-4">
          Edit Persona
        </h2>

        {/* Name */}
        <label className="block font-semibold text-base-content mb-1">
          Name:
        </label>
        <input
          className="input input-bordered w-full mb-3"
          value={editedPersona.name}
          onChange={(e) =>
            setEditedPersona({ ...editedPersona, name: e.target.value })
          }
        />

        {/* Description */}
        <label className="block font-semibold text-base-content mb-1">
          Description:
        </label>
        <textarea
          className="textarea textarea-bordered w-full mb-3"
          value={editedPersona.description}
          onChange={(e) =>
            setEditedPersona({ ...editedPersona, description: e.target.value })
          }
        />

        {/* Default Prompt */}
        <label className="block font-semibold text-base-content mb-1">
          Default Prompt:
        </label>
        <textarea
          className="textarea textarea-bordered w-full mb-3"
          value={editedPersona.defaultPrompt}
          onChange={(e) =>
            setEditedPersona({
              ...editedPersona,
              defaultPrompt: e.target.value,
            })
          }
        />

        {/* Questions Section */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <label className="block font-semibold text-base-content">
              Conversation Questions:
            </label>
            <button
              className={`btn btn-sm ${canGenerateSuggestions ? 'btn-primary' : 'btn-disabled'}`}
              onClick={generateSuggestions}
              disabled={!canGenerateSuggestions || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'AI Suggest All Questions'}
            </button>
          </div>

          {/* Initial Question */}
          <div className="mb-3">
            <label className="block text-sm text-base-content/70 mb-1">
              Initial Question:
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={editedPersona.initialQuestion || ""}
              onChange={(e) =>
                setEditedPersona({
                  ...editedPersona,
                  initialQuestion: e.target.value,
                })
              }
              placeholder="Enter the initial question"
            />
          </div>

          {/* Follow-up Questions */}
          {editedPersona.followUpQuestions?.map((question, index) => (
            <div key={index} className="mb-3">
              <label className="block text-sm text-base-content/70 mb-1">
                Follow-up Question {index + 1}:
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                value={question}
                onChange={(e) => handleFollowUpChange(index, e.target.value)}
                placeholder={`Enter follow-up question ${index + 1}`}
              />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-4">
          <button
            className="btn btn-error btn-outline"
            onClick={() => onDelete(persona.id)}
          >
            Remove
          </button>
          <div className="flex gap-2">
            <button className="btn btn-neutral" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onSave(editedPersona)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
