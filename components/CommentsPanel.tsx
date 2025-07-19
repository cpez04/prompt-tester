"use client";

import { useState, useEffect, useRef } from "react";
import { AgentComment } from "@/types";
import { ANALYSIS_AGENTS } from "./AgentSelector";

interface CommentsPanelProps {
  comments: AgentComment[];
  visibleAgents: Set<string>;
  onAgentToggle: (agentId: string) => void;
  onCommentClick: (comment: AgentComment) => void;
  selectedComment: AgentComment | null;
  currentPage: number;
}

export default function CommentsPanel({
  comments,
  visibleAgents,
  onCommentClick,
  selectedComment,
  currentPage,
}: CommentsPanelProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const selectedCommentRef = useRef<HTMLDivElement>(null);

  // Auto-expand agent section and scroll to comment when selected
  useEffect(() => {
    if (selectedComment) {
      // Expand the agent section for the selected comment
      setExpandedAgents((prev) => new Set([...prev, selectedComment.agentId]));

      // Scroll to the selected comment after a brief delay to allow DOM update
      setTimeout(() => {
        if (selectedCommentRef.current) {
          selectedCommentRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
    }
  }, [selectedComment]);

  const toggleAgentExpansion = (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  // Group comments by agent
  const commentsByAgent = comments.reduce(
    (acc, comment) => {
      if (!acc[comment.agentId]) {
        acc[comment.agentId] = [];
      }
      acc[comment.agentId].push(comment);
      return acc;
    },
    {} as Record<string, AgentComment[]>,
  );

  // Get agents that have comments
  const agentsWithComments = ANALYSIS_AGENTS.filter(
    (agent) =>
      commentsByAgent[agent.id] && commentsByAgent[agent.id].length > 0,
  );

  // Filter comments for current page
  const getCurrentPageComments = (agentComments: AgentComment[]) => {
    return agentComments.filter(
      (comment) => comment.coordinates.page === currentPage,
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <h2 className="text-lg font-semibold text-base-content">
          Analysis Comments
        </h2>
        <p className="text-sm text-base-content/70 mt-1">
          Page {currentPage + 1} •{" "}
          {comments.filter((c) => c.coordinates.page === currentPage).length}{" "}
          comments
        </p>
      </div>


      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {agentsWithComments.length === 0 ? (
          <div className="p-4 text-center text-base-content/60">
            No comments found for this syllabus.
          </div>
        ) : (
          agentsWithComments.map((agent) => {
            const agentComments = commentsByAgent[agent.id] || [];
            const pageComments = getCurrentPageComments(agentComments);
            const isExpanded = expandedAgents.has(agent.id);
            const isVisible = visibleAgents.has(agent.id);

            if (!isVisible || pageComments.length === 0) return null;

            return (
              <div key={agent.id} className="border-b border-base-300">
                {/* Agent Header */}
                <button
                  onClick={() => toggleAgentExpansion(agent.id)}
                  className="w-full p-4 text-left hover:bg-base-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                      <span className="font-medium text-base-content">
                        {agent.name}
                      </span>
                      <span className="text-xs text-base-content/60">
                        {pageComments.length} comment
                        {pageComments.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div
                      className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    >
                      ▶
                    </div>
                  </div>
                </button>

                {/* Agent Comments */}
                {isExpanded && (
                  <div className="pb-2">
                    {pageComments.map((comment) => (
                      <div
                        key={comment.id}
                        ref={
                          selectedComment?.id === comment.id
                            ? selectedCommentRef
                            : null
                        }
                        className={`mx-4 mb-3 rounded-lg cursor-pointer transition-all border-2 ${
                          selectedComment?.id === comment.id
                            ? "border-opacity-100 shadow-lg"
                            : "hover:bg-base-50 border-transparent hover:shadow-md"
                        }`}
                        style={{
                          backgroundColor:
                            selectedComment?.id === comment.id
                              ? `${agent.color}10`
                              : "transparent",
                          borderColor:
                            selectedComment?.id === comment.id
                              ? agent.color
                              : "transparent",
                        }}
                        onClick={() => onCommentClick(comment)}
                      >
                        {/* Comment Header */}
                        <div className="p-3 pb-2">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: agent.color }}
                            />
                            <span
                              className="font-medium text-xs"
                              style={{ color: agent.color }}
                            >
                              {agent.name}
                            </span>
                          </div>

                          {/* Comment Content */}
                          <p
                            className={`text-sm text-base-content leading-relaxed ${
                              selectedComment?.id === comment.id
                                ? ""
                                : "line-clamp-3"
                            }`}
                          >
                            {comment.content}
                          </p>
                        </div>

                        {/* Referenced Text */}
                        <div className="px-3 pb-3">
                          <div
                            className="text-xs text-base-content/60 italic border-l-3 pl-3 py-1 bg-base-100/50 rounded-r"
                            style={{ borderColor: agent.color }}
                          >
                            <div className="text-base-content/40 mb-1">
                              Referenced text:
                            </div>
                            &quot;
                            {selectedComment?.id === comment.id
                              ? comment.sentence
                              : comment.sentence.length > 60
                                ? comment.sentence.substring(0, 60) + "..."
                                : comment.sentence}
                            &quot;
                          </div>
                        </div>

                        {/* Expanded Details for Selected Comment */}
                        {selectedComment?.id === comment.id && (
                          <div className="px-3 pb-3 border-t border-base-200 pt-3 mt-2">
                            <div className="flex items-center justify-between text-xs text-base-content/50">
                              <span>Page {comment.coordinates.page + 1}</span>
                              <span>
                                Position: {Math.round(comment.coordinates.x)},{" "}
                                {Math.round(comment.coordinates.y)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-base-300 bg-base-50">
        <div className="text-xs text-base-content/60 text-center">
          Total: {comments.length} comments across {agentsWithComments.length}{" "}
          agents
        </div>
      </div>
    </div>
  );
}
