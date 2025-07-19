"use client";

import { useState } from "react";
import { AnalysisAgent } from "@/types";

const ANALYSIS_AGENTS: AnalysisAgent[] = [
  {
    id: "clarity",
    name: "Clarity Agent",
    description:
      "Analyzes language clarity, identifies jargon, and flags ambiguous statements.",
    color: "#3B82F6",
    prompt:
      "You are a clarity analysis agent. Review the syllabus text and identify areas where language is unclear, ambiguous, or contains unexplained jargon. Focus on sentence-level analysis. For each issue found, provide a specific comment explaining why the text is unclear and suggest improvements.",
  },
  {
    id: "completeness",
    name: "Completeness Agent",
    description:
      "Identifies missing course elements like grading policies, schedules, requirements, and potential loopholes.",
    color: "#10B981",
    prompt:
      "You are a completeness analysis agent. Review the syllabus to identify missing essential course elements such as grading criteria, course schedules, assignment details, attendance policies, academic integrity policies, and course objectives. Also, look for loopholes or gaps in the syllabus that students could exploit or misunderstand. Focus on what information students would need but cannot find, and any ambiguities that could be taken advantage of.",
  },
  {
    id: "accessibility",
    name: "Accessibility Agent",
    description: "Checks for inclusive language and accommodation information.",
    color: "#8B5CF6",
    prompt:
      "You are an accessibility analysis agent. Review the syllabus for inclusive language, accommodation policies, and barriers that might prevent diverse learners from succeeding. Look for language that may exclude certain groups and check if accessibility resources are mentioned.",
  },
  {
    id: "organization",
    name: "Organization Agent",
    description:
      "Reviews structure, flow, and logical sequencing of information.",
    color: "#F59E0B",
    prompt:
      "You are an organization analysis agent. Evaluate the syllabus structure, information flow, and logical sequencing. Identify areas where information is poorly organized, sections that should be moved or combined, and opportunities to improve navigation and readability.",
  },
];

interface AgentSelectorProps {
  onAgentSelect: (agents: AnalysisAgent[]) => void;
}

export default function AgentSelector({ onAgentSelect }: AgentSelectorProps) {
  const [selectedAgents, setSelectedAgents] = useState<AnalysisAgent[]>([]);

  const handleAgentToggle = (agent: AnalysisAgent) => {
    const isSelected = selectedAgents.some((a) => a.id === agent.id);
    let newSelection: AnalysisAgent[];

    if (isSelected) {
      newSelection = selectedAgents.filter((a) => a.id !== agent.id);
    } else {
      newSelection = [...selectedAgents, agent];
    }

    setSelectedAgents(newSelection);
    onAgentSelect(newSelection);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-base-content">
        Select Analysis Agents ({selectedAgents.length}/5)
      </h3>

      <div className="grid gap-3">
        {ANALYSIS_AGENTS.map((agent) => {
          const isSelected = selectedAgents.some((a) => a.id === agent.id);

          return (
            <div
              key={agent.id}
              className={`card cursor-pointer transition-all duration-200 border-2 ${
                isSelected
                  ? "bg-base-100 border-opacity-100"
                  : "bg-base-100 hover:bg-base-200 border-transparent"
              }`}
              style={{
                borderColor: isSelected ? agent.color : "transparent",
              }}
              onClick={() => handleAgentToggle(agent)}
            >
              <div className="card-body p-4">
                <div className="flex items-start gap-3">
                  <div className="form-control">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleAgentToggle(agent)}
                      className="checkbox"
                      style={{
                        accentColor: agent.color,
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                      <h4 className="font-medium text-base-content">
                        {agent.name}
                      </h4>
                    </div>

                    <p className="text-sm text-base-content/70">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ANALYSIS_AGENTS };
