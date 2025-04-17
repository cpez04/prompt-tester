// PersonaCarousel.tsx

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PersonaEditor from "./PersonaEditor";
import { Persona } from "@/types";

export default function PersonaCarousel({
  onPersonaSelect,
}: {
  onPersonaSelect: (personas: Persona[]) => void;
}) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // Load personas and merge with saved edits
  useEffect(() => {
    fetch("/personas.json")
      .then((res) => res.json())
      .then((data: Persona[]) => {
        const storedEdits = localStorage.getItem("editedPersonas");
        if (storedEdits) {
          const edits: Record<string, Persona> = JSON.parse(storedEdits);
          const merged = data.map((p) => edits[p.id] || p);
          setPersonas(merged);
        } else {
          setPersonas(data);
        }
      })
      .catch((err) => console.error("Failed to load personas:", err));
  }, []);

  // Load selected personas from localStorage on mount
  useEffect(() => {
    const storedSelected = localStorage.getItem("selectedPersonas");
    if (storedSelected) {
      setSelectedPersonas(JSON.parse(storedSelected));
    }
  }, []);

  // Save selected personas when it changes
  useEffect(() => {
    localStorage.setItem("selectedPersonas", JSON.stringify(selectedPersonas));
    onPersonaSelect(personas.filter((p) => selectedPersonas.includes(p.id)));
  }, [selectedPersonas, personas, onPersonaSelect]);

  const handlePersonaClick = (persona: Persona) => {
    setSelectedPersonas((prev) =>
      prev.includes(persona.id)
        ? prev.filter((id) => id !== persona.id)
        : [...prev, persona.id],
    );
  };

  const handleDoubleClick = (persona: Persona) => {
    setEditingPersona(persona);
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Select Personas</h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide p-2">
        {personas.map((persona) => (
          <motion.div
            key={persona.id}
            className={`p-4 rounded-lg cursor-pointer min-w-[200px] border relative ${
              selectedPersonas.includes(persona.id)
                ? "border-primary bg-primary/10"
                : "border-base-300 bg-base-200 shadow-md"
            }`}
            whileHover={{ scale: 1.05 }}
            onClick={() => handlePersonaClick(persona)}
          >
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold text-lg pr-6">{persona.name}</h3>
              <button
                className="p-1 hover:bg-base-300 rounded-full flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingPersona(persona);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">{persona.description}</p>
          </motion.div>
        ))}
      </div>

      {editingPersona && (
        <PersonaEditor
          persona={editingPersona}
          onClose={() => setEditingPersona(null)}
          onSave={(updatedPersona) => {
            setPersonas((prev) =>
              prev.map((p) =>
                p.id === updatedPersona.id ? updatedPersona : p,
              ),
            );
            const stored = localStorage.getItem("editedPersonas");
            const edits: Record<string, Persona> = stored
              ? JSON.parse(stored)
              : {};
            edits[updatedPersona.id] = updatedPersona;
            localStorage.setItem("editedPersonas", JSON.stringify(edits));
            setEditingPersona(null);
          }}
          onDelete={(personaId) => {
            setPersonas((prev) => prev.filter((p) => p.id !== personaId));
            const stored = localStorage.getItem("editedPersonas");
            if (stored) {
              const edits: Record<string, Persona> = JSON.parse(stored);
              delete edits[personaId];
              localStorage.setItem("editedPersonas", JSON.stringify(edits));
            }
            setSelectedPersonas((prev) =>
              prev.filter((id) => id !== personaId),
            );
            setEditingPersona(null);
          }}
        />
      )}
    </div>
  );
}
