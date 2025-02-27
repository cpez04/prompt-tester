import React from "react";

interface Persona {
  id: string;
  name: string;
  description: string;
}

interface ExportChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  selectedPersonas: string[];
  setSelectedPersonas: React.Dispatch<React.SetStateAction<string[]>>;
  exportChats: () => void;
}

const ExportChatsModal: React.FC<ExportChatsModalProps> = ({
  isOpen,
  onClose,
  personas,
  selectedPersonas,
  setSelectedPersonas,
  exportChats,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="p-5 rounded-lg shadow-lg w-96 bg-base-200 border border-base-300">
        <h2 className="text-lg font-semibold mb-2">
          Select Conversations to Export
        </h2>

        <div className="flex flex-col space-y-2">
          {personas.map((persona) => {
            return (
              <label key={persona.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedPersonas.includes(persona.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPersonas([...selectedPersonas, persona.name]);
                    } else {
                      setSelectedPersonas(
                        selectedPersonas.filter(
                          (name) => name !== persona.name,
                        ),
                      );
                    }
                  }}
                />
                <span>{persona.name}</span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button className="btn btn-sm btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={exportChats}
            disabled={selectedPersonas.length === 0}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportChatsModal;
