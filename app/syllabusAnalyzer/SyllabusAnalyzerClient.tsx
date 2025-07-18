"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import AnnotatedPDFViewer from "@/components/AnnotatedPDFViewer";
import CommentsPanel from "@/components/CommentsPanel";
import { SyllabusAnalysis, AgentComment } from "@/types";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export default function SyllabusAnalyzerClient() {
  const { user, loading: userLoading } = useUser();
  const { isAdmin } = useAdminStatus();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<SyllabusAnalysis | null>(null);
  const [selectedComment, setSelectedComment] = useState<AgentComment | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleAgents, setVisibleAgents] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Starting analysis...");

  const startAnalysis = useCallback(
    async (processingData: {
      base64Pdf: string;
      selectedAgents: unknown[];
      fileName: string;
    }) => {
      try {
        setLoadingMessage("Analyzing syllabus with AI agents...");

        // Call agent analysis API
        const analysisResponse = await fetch("/api/analyzeSyllabusAgents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Pdf: processingData.base64Pdf,
            selectedAgents: processingData.selectedAgents,
            fileName: processingData.fileName,
          }),
        });

        if (!analysisResponse.ok) {
          throw new Error("Failed to analyze syllabus");
        }

        const analysisData = await analysisResponse.json();

        // Store completed analysis
        localStorage.setItem("syllabusAnalysis", JSON.stringify(analysisData));
        setAnalysis(analysisData);
        setIsProcessing(false);

        // Initialize all agents as visible
        const agentIds = new Set<string>(
          analysisData.comments.map((c: AgentComment) => c.agentId),
        );
        setVisibleAgents(agentIds);

        // Reset to first page to ensure proper loading
        setCurrentPage(0);
      } catch (error) {
        console.error("Analysis failed:", error);
        setIsProcessing(false);
        // Could add error state here
        router.push("/syllabusplayground");
      }
    },
    [router],
  );

  useEffect(() => {
    // Load analysis data from localStorage
    const stored = localStorage.getItem("syllabusAnalysis");
    if (stored) {
      try {
        const analysisData = JSON.parse(stored);

        if (analysisData.status === "processing") {
          // Start processing
          setIsProcessing(true);
          startAnalysis(analysisData);
        } else {
          // Already processed
          setAnalysis(analysisData);

          // Initialize all agents as visible
          const agentIds = new Set<string>(
            analysisData.comments.map((c: AgentComment) => c.agentId),
          );
          setVisibleAgents(agentIds);

          // Reset to first page to ensure proper loading
          setCurrentPage(0);
        }
      } catch (error) {
        console.error("Error parsing analysis data:", error);
        router.push("/syllabusplayground");
      }
    } else {
      // No analysis data, redirect back to playground
      router.push("/syllabusplayground");
    }
  }, [router, startAnalysis]);

  const handleCommentClick = (comment: AgentComment) => {
    setSelectedComment(comment);
    setCurrentPage(comment.coordinates.page);
  };

  const handleAgentToggle = (agentId: string) => {
    const newVisible = new Set(visibleAgents);
    if (newVisible.has(agentId)) {
      newVisible.delete(agentId);
    } else {
      newVisible.add(agentId);
    }
    setVisibleAgents(newVisible);
  };

  const handleBackToPlayground = () => {
    router.push("/syllabusplayground");
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-base-200">
        {/* Header */}
        <div className="bg-base-100 border-b border-base-300 p-4">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold">Analyzing Syllabus...</h1>
              <p className="text-sm text-base-content/70">
                Please wait while we process your document
              </p>
            </div>
            <ProfileIcon user={user} loading={userLoading} isAdmin={isAdmin} />
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex justify-center items-center min-h-[calc(100vh-80px)] p-8">
          <div className="max-w-md w-full bg-base-100 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 loading loading-spinner loading-lg text-primary"></div>
              <h2 className="text-xl font-semibold mb-2">
                Processing Your Syllabus
              </h2>
              <p className="text-base-content/70 text-sm">{loadingMessage}</p>
            </div>

            <div className="text-xs text-base-content/50">
              This may take a few moments depending on the document size and
              selected agents.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading Analysis...</h2>
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    );
  }

  // Filter comments by visible agents and current page
  const visibleComments = analysis.comments.filter(
    (comment) =>
      visibleAgents.has(comment.agentId) &&
      comment.coordinates.page === currentPage,
  );

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 p-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToPlayground}
              className="btn btn-ghost btn-sm"
            >
              ← Back to Playground
            </button>
            <div>
              <h1 className="text-2xl font-bold">Syllabus Analysis Results</h1>
              <p className="text-sm text-base-content/70">
                {analysis.fileName}
              </p>
            </div>
          </div>
          <ProfileIcon user={user} loading={userLoading} isAdmin={isAdmin} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* PDF Viewer */}
        <div className="flex-1 p-4">
          <AnnotatedPDFViewer
            pdfPages={analysis.pdfPages}
            comments={visibleComments}
            selectedComment={selectedComment}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onCommentSelect={setSelectedComment}
          />
        </div>

        {/* Comments Panel */}
        <div className="w-96 border-l border-base-300 bg-base-100">
          <CommentsPanel
            comments={analysis.comments}
            visibleAgents={visibleAgents}
            onAgentToggle={handleAgentToggle}
            onCommentClick={handleCommentClick}
            selectedComment={selectedComment}
            currentPage={currentPage}
          />
        </div>
      </div>
    </div>
  );
}
