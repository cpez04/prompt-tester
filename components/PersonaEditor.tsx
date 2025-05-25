"use client";

import { useState, useEffect } from "react";
import { Persona } from "@/types";

export default function PersonaEditor({
  persona,
  onClose,
  onSave,
}: {
  persona: Persona;
  onClose: () => void;
  onSave: (persona: Persona) => void;
}) {
  const [editedPersona, setEditedPersona] = useState<Persona>({
    ...persona,
    followUpQuestions: persona.followUpQuestions || Array(4).fill(""),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedSuggestions, setHasGeneratedSuggestions] = useState(false);
  const [playgroundPrompt, setPlaygroundPrompt] = useState("");
  const [personaContext, setPersonaContext] = useState("");

  // Add auto-resize function
  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  useEffect(() => {
    // Load values from localStorage
    const storedPrompt = localStorage.getItem("prompt") || "";
    const storedContext = localStorage.getItem("personaSituationContext") || "";
    setPlaygroundPrompt(storedPrompt);
    setPersonaContext(storedContext);
  }, []);

  // Add effect to set initial height
  useEffect(() => {
    const textarea = document.querySelector(
      'textarea[name="defaultPrompt"]',
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, []);

  const canGenerateSuggestions =
    editedPersona.name &&
    editedPersona.description &&
    editedPersona.defaultPrompt;

  const generateSuggestions = async () => {
    if (!canGenerateSuggestions) return;

    // Validate that we have the required values
    if (
      !editedPersona.name ||
      !editedPersona.description ||
      !editedPersona.defaultPrompt
    ) {
      console.error("Missing required fields:", {
        name: editedPersona.name,
        description: editedPersona.description,
        defaultPrompt: editedPersona.defaultPrompt,
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log("Sending to API:", {
        name: editedPersona.name,
        description: editedPersona.description,
        defaultPrompt: editedPersona.defaultPrompt,
        playgroundPrompt,
        personaContext,
      });

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
        followUpQuestions: data.followUpQuestions,
      });
      setHasGeneratedSuggestions(true);
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
      followUpQuestions: newFollowUps,
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-base-200 border border-base-300 p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
          name="defaultPrompt"
          className="textarea textarea-bordered w-full mb-3 overflow-hidden"
          value={editedPersona.defaultPrompt}
          onChange={(e) => {
            setEditedPersona({
              ...editedPersona,
              defaultPrompt: e.target.value,
            });
            autoResizeTextarea(e);
          }}
          style={{ resize: "none", minHeight: "100px" }}
        />

        {/* Questions Section */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <label className="block font-semibold text-base-content">
                Conversation Interactions
              </label>
              <div
                className="tooltip tooltip-right"
                data-tip="The initial interaction must be a question, but follow-up interactions can be questions, comments, observations, or other natural conversation elements."
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-base-content/70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
            </div>
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <span className="loading loading-dots loading-sm"></span>
                <span className="text-sm">Generating...</span>
              </div>
            ) : (
              !hasGeneratedSuggestions && (
                <div
                  className="tooltip tooltip-left"
                  data-tip="Generate AI suggestions for conversation interactions"
                >
                  <button
                    className={`btn btn-primary btn-sm gap-2 ${
                      !canGenerateSuggestions ? "btn-disabled" : ""
                    }`}
                    onClick={generateSuggestions}
                    disabled={!canGenerateSuggestions}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Suggest
                  </button>
                </div>
              )
            )}
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
              placeholder="Enter the initial question (must be a question)"
            />
          </div>

          {/* Follow-up Interactions */}
          {editedPersona.followUpQuestions?.map((interaction, index) => (
            <div key={index} className="mb-3">
              <label className="block text-sm text-base-content/70 mb-1">
                Follow-up Interaction {index + 1}:
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                value={interaction}
                onChange={(e) => handleFollowUpChange(index, e.target.value)}
                placeholder={`Enter follow-up interaction ${index + 1} (can be a question, comment, observation, etc.)`}
              />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-4">
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
  );
}
