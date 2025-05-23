"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import { Persona } from "@/types";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

interface TestData {
  parsedContent: {
    pages: { index: number; markdown: string }[];
  };
  selectedPersonas: Persona[];
  fileName: string;
  pdfPages: string[]; // Array of base64 encoded individual pages
}

interface PageAnalysis {
  pageIndex: number;
  response: string;
  isComplete: boolean;
  isProcessing: boolean;
}

export default function SyllabusTester() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [testData, setTestData] = useState<TestData | null>(null);
  const [selectedPersonaIndex, setSelectedPersonaIndex] = useState(0);
  const [pageAnalyses, setPageAnalyses] = useState<PageAnalysis[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const responseBuffers = useRef<{ [key: number]: string }>({});

  useEffect(() => {
    if (!userLoading && user?.email) {
      if (!ADMIN_EMAILS.includes(user.email)) {
        router.push("/");
      }
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    const stored = localStorage.getItem("syllabusTestData");
    if (!stored) {
      router.push("/syllabusplayground");
      return;
    }

    const parsed = JSON.parse(stored);
    setTestData(parsed);
  }, [router]);

  useEffect(() => {
    if (!testData) return;
    const initial = testData.parsedContent.pages.map((page) => ({
      pageIndex: page.index,
      response: "",
      isComplete: false,
      isProcessing: false,
    }));
    setPageAnalyses(initial);
  }, [testData]);

  const analyzePage = async (pageIndex: number) => {
    if (!testData) return;
    const persona = testData.selectedPersonas[selectedPersonaIndex];
    const pageMarkdown = testData.parsedContent.pages[pageIndex].markdown;

    setPageAnalyses((prev) =>
      prev.map((a) =>
        a.pageIndex === pageIndex ? { ...a, isProcessing: true } : a
      )
    );

    try {
      const res = await fetch("/api/analyzeSyllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, content: pageMarkdown, pageNumber: pageIndex }),
      });

      if (!res.ok) throw new Error("Failed to analyze page");

      const reader = res.body!.getReader();
      responseBuffers.current[pageIndex] = "";
      let timer: NodeJS.Timeout | null = null;

      const flush = () => {
        setPageAnalyses((prev) =>
          prev.map((a) =>
            a.pageIndex === pageIndex
              ? { ...a, response: responseBuffers.current[pageIndex] }
              : a
          )
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        responseBuffers.current[pageIndex] += new TextDecoder().decode(value);
        if (!timer) {
          timer = setTimeout(() => {
            flush();
            timer = null;
          }, 100);
        }
      }

      flush();

      setPageAnalyses((prev) =>
        prev.map((a) =>
          a.pageIndex === pageIndex
            ? { ...a, isComplete: true, isProcessing: false }
            : a
        )
      );
    } catch (err) {
      console.error(err);
      setPageAnalyses((prev) =>
        prev.map((a) =>
          a.pageIndex === pageIndex ? { ...a, isProcessing: false } : a
        )
      );
    }
  };

  const nextPage = () =>
    setCurrentPage((p) => Math.min(p + 1, (testData?.pdfPages.length ?? 1) - 1));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 0));

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

  if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
    return null;
  }

  if (!testData) return null;

  const analysis = pageAnalyses[currentPage];

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Syllabus Tester</h1>
        <ProfileIcon user={user} loading={userLoading} />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">File: {testData.fileName}</h2>
            <p className="text-sm text-base-content/70">
              Personas: {testData.selectedPersonas.map((p) => p.name).join(", ")}
            </p>
          </div>
        </div>

        <div className="tabs tabs-boxed mb-4">
          {testData.selectedPersonas.map((p, i) => (
            <button
              key={p.id}
              className={`tab ${i === selectedPersonaIndex ? "tab-active" : ""}`}
              onClick={() => setSelectedPersonaIndex(i)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* PDF Viewer via iframe */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">PDF Preview</h3>
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                  >
                    « Previous Page
                  </button>
                  <button
                    className="join-item btn btn-sm"
                    onClick={nextPage}
                    disabled={currentPage + 1 >= testData.pdfPages.length}
                  >
                    Next Page »
                  </button>
                </div>
              </div>
              <div className="border border-base-300 rounded-lg bg-white h-[600px] overflow-hidden">
                <iframe
                  src={testData.pdfPages[currentPage]}
                  title="Syllabus PDF"
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Analysis for Page {currentPage + 1}</h3>
                {!analysis?.isComplete && !analysis?.isProcessing && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => analyzePage(currentPage)}
                  >
                    Analyze Page
                  </button>
                )}
                {analysis?.isProcessing && (
                  <div className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                )}
              </div>
              <div className="bg-base-200 rounded-lg p-4 h-[600px] overflow-auto">
                <div className="prose prose-sm max-w-none">
                  {analysis?.response ? (
                    <div className="whitespace-pre-wrap text-base-content">
                      {analysis.response}
                    </div>
                  ) : (
                    <div className="text-base-content/70 italic">
                      Click &apos;Analyze Page&apos; to get started
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              « Previous Page
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={nextPage}
              disabled={currentPage + 1 >= testData.pdfPages.length}
            >
              Next Page »
            </button>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => router.push("/syllabusplayground")}
          >
            Start New Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
