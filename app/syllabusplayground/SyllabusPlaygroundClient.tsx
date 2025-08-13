"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import AgentSelector from "@/components/AgentSelector";
import { AnalysisAgent } from "@/types";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export default function SyllabusPlaygroundClient() {
  const { user, loading: userLoading } = useUser();
  const { isAdmin } = useAdminStatus();
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<AnalysisAgent[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [fileDataUrl] = useState<string | null>(null);

  const router = useRouter();

  const handleProcessSyllabus = async () => {
    if (!syllabusFile) {
      setError("Please upload a syllabus file");
      return;
    }

    if (selectedAgents.length === 0) {
      setError("Please select at least one analysis agent");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convert file to base64
      const base64FullDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(syllabusFile);
      });

      const base64Only = base64FullDataUrl.split(",")[1];

      // Store processing state and navigate immediately
      const processingData = {
        base64Pdf: base64Only,
        selectedAgents: selectedAgents,
        selectedModel: selectedModel,
        fileName: syllabusFile.name,
        status: "processing",
      };

      localStorage.setItem("syllabusAnalysis", JSON.stringify(processingData));
      router.push("/syllabusAnalyzer");
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Syllabus Analyzer</h1>
        <ProfileIcon user={user} loading={userLoading} isAdmin={isAdmin} />
      </div>

      {!disclaimerAccepted ? (
        <div className="max-w-3xl mx-auto bg-base-100 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">
            Syllabus Analyzer (Beta) Disclaimer
          </h2>
          <p className="mb-4">
            Welcome to the Syllabus Analyzer (Beta)! This tool is designed to
            help you analyze and improve your course syllabus using specialized
            AI agents that examine different aspects like clarity, completeness,
            and accessibility.
          </p>
          <p className="mb-4">
            Please note that this is a beta feature and may have some
            limitations or unexpected behavior. Your feedback is valuable in
            helping us improve the tool.
          </p>
          <div className="flex justify-end">
            <button
              className="btn btn-primary"
              onClick={() => setDisclaimerAccepted(true)}
            >
              I Understand
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Upload Syllabus</h2>
                <p className="text-sm text-base-content/70 mb-4">
                  Upload your syllabus in PDF format to extract its content.
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  className="file-input file-input-bordered w-full"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== "application/pdf") {
                        setError("Please upload a PDF file");
                        return;
                      }
                      setSyllabusFile(file);
                      setError(null);
                    }
                  }}
                />
                {error && <p className="text-error text-sm mt-2">{error}</p>}
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Select Agent LLM Model</h2>
                <p className="text-sm text-base-content/70 mb-4">
                  Choose which LLM model to use for analysis. 
                </p>
                <select
                  className="select select-bordered w-full"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4">GPT-4.1</option>
                </select>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Select Analysis Agents</h2>
                <p className="text-sm text-base-content/70 mb-4">
                  Choose which aspects of your syllabus you want to analyze.
                  Each agent specializes in a different area of evaluation.
                </p>
                <AgentSelector onAgentSelect={setSelectedAgents} />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="btn btn-primary"
                onClick={handleProcessSyllabus}
                disabled={
                  !syllabusFile || selectedAgents.length === 0 || isProcessing
                }
              >
                {isProcessing ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Analyze Syllabus"
                )}
              </button>
            </div>

            {fileDataUrl && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-2">
                  Preview Uploaded PDF
                </h2>
                <iframe
                  src={fileDataUrl}
                  title="Uploaded Syllabus Preview"
                  className="w-full h-96 border"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
