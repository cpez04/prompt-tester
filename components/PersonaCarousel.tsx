import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PersonaEditor from "./PersonaEditor";

interface Persona {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
}

export default function PersonaCarousel({
  onPersonaSelect,
}: {
  onPersonaSelect: (personas: Persona[]) => void;
}) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  useEffect(() => {
    fetch("/personas.json")
      .then((res) => res.json())
      .then((data: Persona[]) => setPersonas(data))
      .catch((err) => console.error("Failed to load personas:", err));
  }, []);

  // Update `onPersonaSelect` when `selectedPersonas` changes
  useEffect(() => {
    onPersonaSelect(personas.filter((p) => selectedPersonas.includes(p.id)));
  }, [selectedPersonas, personas, onPersonaSelect]);

  // Toggle persona selection
  const handlePersonaClick = (persona: Persona) => {
    setSelectedPersonas((prev) =>
      prev.includes(persona.id)
        ? prev.filter((id) => id !== persona.id)
        : [...prev, persona.id],
    );
  };

  // Open Persona Editor on double-click
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
            className={`p-4 rounded-lg cursor-pointer min-w-[200px] border ${
              selectedPersonas.includes(persona.id)
                ? "border-primary bg-primary/10"
                : "border-base-300 bg-base-200 shadow-md"
            }`}
            whileHover={{ scale: 1.05 }}
            onClick={() => handlePersonaClick(persona)}
            onDoubleClick={() => handleDoubleClick(persona)}
          >
            <h3 className="font-semibold text-lg">{persona.name}</h3>
            <p className="text-sm text-gray-500">{persona.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Persona Editor Modal */}
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
            setEditingPersona(null);
          }}
          onDelete={(personaId) => {
            setPersonas((prev) => prev.filter((p) => p.id !== personaId));
            setEditingPersona(null);
          }}
        />
      )}
    </div>
  );
}
