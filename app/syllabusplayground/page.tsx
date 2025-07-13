"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import PersonaCarousel from "@/components/PersonaCarousel";
import { Persona } from "@/types";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export default function SyllabusPlayground() {
  const { user, loading: userLoading } = useUser();
  const { isAdmin } = useAdminStatus();
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [selectedPersonas, setSelectedPersonas] = useState<Persona[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [fileDataUrl] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !isAdmin && user) {
      router.push("/");
    }
  }, [user, userLoading, isAdmin, router]);

  const handleProcessSyllabus = async () => {
    if (!syllabusFile) {
      setError("Please upload a syllabus file");
      return;
    }

    if (selectedPersonas.length === 0) {
      setError("Please select at least one persona");
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

      // Call OCR API
      const ocrResponse = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Pdf: base64Only }),
      });

      if (!ocrResponse.ok) {
        throw new Error("Failed to process syllabus with OCR");
      }

      const ocrData = await ocrResponse.json();

      // Split PDF into individual pages
      const splitPdfResponse = await fetch("/api/splitPdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Pdf: base64Only }),
      });

      if (!splitPdfResponse.ok) {
        throw new Error("Failed to split PDF into pages");
      }

      const { pages } = await splitPdfResponse.json();

      const testData = {
        parsedContent: ocrData,
        selectedPersonas,
        fileName: syllabusFile.name,
        pdfPages: pages, // Array of base64 encoded individual pages
      };

      localStorage.setItem("syllabusTestData", JSON.stringify(testData));
      router.push("/syllabusTester");
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

  if (!user) {
    router.push("/login");
    return null;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Syllabus Tester</h1>
        <ProfileIcon user={user} loading={userLoading} isAdmin={isAdmin} />
      </div>

      {!disclaimerAccepted ? (
        <div className="max-w-3xl mx-auto bg-base-100 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">
            Syllabus Tester (Beta) Disclaimer
          </h2>
          <p className="mb-4">
            Welcome to the Syllabus Tester (Beta)! This tool is designed to help
            you analyze and improve your course syllabus by extracting its
            content and testing it with different student personas.
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
                <h2 className="card-title">Select Personas</h2>
                <p className="text-sm text-base-content/70 mb-4">
                  Choose the student personas you want to test your syllabus
                  with.
                </p>
                <PersonaCarousel onPersonaSelect={setSelectedPersonas} />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="btn btn-primary"
                onClick={handleProcessSyllabus}
                disabled={
                  !syllabusFile || selectedPersonas.length === 0 || isProcessing
                }
              >
                {isProcessing ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Process Syllabus"
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
