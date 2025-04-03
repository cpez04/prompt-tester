"use client";

import { useState } from "react";
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
  const [editedPersona, setEditedPersona] = useState(persona);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-base-200 border border-base-300 p-6 rounded-lg shadow-lg max-w-md w-full">
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

        {/* Initial Question */}
        <label className="block font-semibold text-base-content mb-1">
          Initial Question:
        </label>
        <textarea
          className="textarea textarea-bordered w-full mb-3"
          value={editedPersona.initialQuestion}
          onChange={(e) =>
            setEditedPersona({
              ...editedPersona,
              initialQuestion: e.target.value,
            })
          }
        />

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
