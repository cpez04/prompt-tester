"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { AgentComment } from "@/types";
import { ANALYSIS_AGENTS } from "./AgentSelector";

interface AnnotatedPDFViewerProps {
  pdfPages: string[];
  comments: AgentComment[];
  selectedComment: AgentComment | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  onCommentSelect: (comment: AgentComment | null) => void;
  visibleAgents: Set<string>;
  onAgentToggle: (agentId: string) => void;
}

export default function AnnotatedPDFViewer({
  pdfPages,
  comments,
  selectedComment,
  currentPage,
  onPageChange,
  onCommentSelect,
  visibleAgents,
  onAgentToggle,
}: AnnotatedPDFViewerProps) {
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentPageData = pdfPages[currentPage];

  useEffect(() => {
    setImageLoaded(false);
  }, [currentPage, currentPageData]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const getAgentColor = (agentId: string) => {
    return (
      ANALYSIS_AGENTS.find((agent) => agent.id === agentId)?.color || "#666"
    );
  };

  // Get agents that have comments on current page
  const currentPageComments = comments.filter(comment => comment.coordinates.page === currentPage);
  const agentsOnCurrentPage = ANALYSIS_AGENTS.filter(agent => 
    currentPageComments.some(comment => comment.agentId === agent.id)
  );

  return (
    <div className="flex flex-col h-full bg-base-100 rounded-lg shadow-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="btn btn-sm btn-ghost"
          >
            ←
          </button>
          <span className="text-sm">
            Page {currentPage + 1} of {pdfPages.length}
          </span>
          <button
            onClick={() =>
              onPageChange(Math.min(pdfPages.length - 1, currentPage + 1))
            }
            disabled={currentPage === pdfPages.length - 1}
            className="btn btn-sm btn-ghost"
          >
            →
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="btn btn-sm btn-ghost">
            -
          </button>
          <span className="text-sm min-w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={handleZoomIn} className="btn btn-sm btn-ghost">
            +
          </button>
        </div>
      </div>

      {/* Agent Controls */}
      {agentsOnCurrentPage.length > 0 && (
        <div className="px-4 py-2 border-b border-base-300 bg-base-50">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-base-content/70">Agents:</span>
            {agentsOnCurrentPage.map((agent) => {
              const isVisible = visibleAgents.has(agent.id);
              const agentCommentsCount = currentPageComments.filter(c => c.agentId === agent.id).length;
              
              return (
                <button
                  key={agent.id}
                  onClick={() => onAgentToggle(agent.id)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs transition-all border ${
                    isVisible 
                      ? 'border-transparent shadow-sm' 
                      : 'border-base-300 bg-base-200/50'
                  }`}
                  style={{
                    backgroundColor: isVisible ? `${agent.color}15` : undefined,
                    color: isVisible ? agent.color : undefined,
                  }}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${isVisible ? '' : 'opacity-40'}`}
                    style={{ backgroundColor: agent.color }}
                  />
                  <span className={isVisible ? 'font-medium' : ''}>{agent.name}</span>
                  <span className="opacity-60">({agentCommentsCount})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PDF Page with Annotations */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative bg-base-200 flex justify-center items-start p-4"
      >
        <div className="relative inline-block">
          {currentPageData && (
            <>
              <Image
                ref={imageRef}
                src={`data:image/png;base64,${currentPageData}`}
                alt={`PDF Page ${currentPage + 1}`}
                width={800}
                height={1000}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  display: imageLoaded ? "block" : "none",
                  width: "auto",
                  height: "auto",
                }}
                onLoad={() => setImageLoaded(true)}
                className="max-w-none"
                unoptimized
              />

              {!imageLoaded && (
                <div className="flex items-center justify-center h-96">
                  <span className="loading loading-spinner loading-lg" />
                </div>
              )}

              {/* Comment Annotations */}
              {imageLoaded &&
                comments
                  .filter(comment => 
                    comment.coordinates.page === currentPage && 
                    visibleAgents.has(comment.agentId)
                  )
                  .map((comment) => (
                  <div key={comment.id}>
                    {/* Subtle Highlight Box */}
                    <div
                      className={`absolute cursor-pointer transition-all ${
                        selectedComment?.id === comment.id
                          ? "ring-2 ring-offset-1"
                          : "hover:ring-1 hover:ring-offset-1"
                      }`}
                      style={
                        {
                          left: comment.coordinates.x * scale,
                          top: comment.coordinates.y * scale,
                          width: comment.coordinates.width * scale,
                          height: comment.coordinates.height * scale,
                          backgroundColor:
                            selectedComment?.id === comment.id
                              ? `${getAgentColor(comment.agentId)}15`
                              : "transparent",
                          borderLeft: `3px solid ${getAgentColor(comment.agentId)}`,
                          "--tw-ring-color": getAgentColor(comment.agentId),
                        } as React.CSSProperties
                      }
                      onClick={() =>
                        onCommentSelect(
                          selectedComment?.id === comment.id ? null : comment,
                        )
                      }
                    />

                    {/* Comment Indicator */}
                    <div
                      className={`absolute w-5 h-5 rounded-full border border-white shadow-md cursor-pointer flex items-center justify-center text-white text-xs transition-all ${
                        selectedComment?.id === comment.id
                          ? "scale-125"
                          : "hover:scale-110"
                      }`}
                      style={{
                        left:
                          (comment.coordinates.x + comment.coordinates.width) *
                            scale +
                          2,
                        top: comment.coordinates.y * scale - 2,
                        backgroundColor: getAgentColor(comment.agentId),
                      }}
                      onClick={() => onCommentSelect(comment)}
                    >
                      💬
                    </div>

                    {/* Subtle Connection Line - only show when selected */}
                    {selectedComment?.id === comment.id && (
                      <svg
                        className="absolute pointer-events-none"
                        style={{
                          left: 0,
                          top: 0,
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <line
                          x1={
                            (comment.coordinates.x +
                              comment.coordinates.width) *
                              scale +
                            2
                          }
                          y1={
                            (comment.coordinates.y +
                              comment.coordinates.height / 2) *
                            scale
                          }
                          x2={
                            (comment.coordinates.x +
                              comment.coordinates.width) *
                              scale +
                            20
                          }
                          y2={comment.coordinates.y * scale}
                          stroke={getAgentColor(comment.agentId)}
                          strokeWidth="1.5"
                          strokeDasharray="3,2"
                          opacity="0.7"
                        />
                      </svg>
                    )}
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
