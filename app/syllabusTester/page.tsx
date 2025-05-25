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
  personaIndex: number;
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const responseBuffers = useRef<{ [key: string]: string }>({});

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
    const initial: PageAnalysis[] = [];
    testData.selectedPersonas.forEach((_, personaIndex) => {
      testData.parsedContent.pages.forEach((page) => {
        initial.push({
          pageIndex: page.index,
          personaIndex,
          response: "",
          isComplete: false,
          isProcessing: false,
        });
      });
    });
    setPageAnalyses(initial);

    // Start analyzing all pages for all personas
    const analyzeAllPages = async () => {
      for (let personaIndex = 0; personaIndex < testData.selectedPersonas.length; personaIndex++) {
        for (let pageIndex = 0; pageIndex < testData.parsedContent.pages.length; pageIndex++) {
          const persona = testData.selectedPersonas[personaIndex];
          const pageMarkdown = testData.parsedContent.pages[pageIndex].markdown;

          setPageAnalyses((prev) =>
            prev.map((a) =>
              a.pageIndex === pageIndex && a.personaIndex === personaIndex
                ? { ...a, isProcessing: true }
                : a
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
            const bufferKey = `${personaIndex}-${pageIndex}`;
            responseBuffers.current[bufferKey] = "";
            let timer: NodeJS.Timeout | null = null;

            const flush = () => {
              setPageAnalyses((prev) =>
                prev.map((a) =>
                  a.pageIndex === pageIndex && a.personaIndex === personaIndex
                    ? { ...a, response: responseBuffers.current[bufferKey] }
                    : a
                )
              );
            };

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              responseBuffers.current[bufferKey] += new TextDecoder().decode(value);
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
                a.pageIndex === pageIndex && a.personaIndex === personaIndex
                  ? { ...a, isComplete: true, isProcessing: false }
                  : a
              )
            );
          } catch (err) {
            console.error(err);
            setPageAnalyses((prev) =>
              prev.map((a) =>
                a.pageIndex === pageIndex && a.personaIndex === personaIndex
                  ? { ...a, isProcessing: false }
                  : a
              )
            );
          }
        }
      }
    };

    analyzeAllPages();
  }, [testData]);

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

  const analysis = pageAnalyses.find(
    (a) => a.pageIndex === currentPage && a.personaIndex === selectedPersonaIndex
  );

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* Always visible toggle button when sidebar is collapsed */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="fixed left-4 top-4 z-50 btn btn-sm btn-circle btn-ghost hover:bg-base-300 transition-all duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Profile Icon */}
      <div className="absolute top-4 right-4 z-50">
        <ProfileIcon user={user} loading={userLoading} />
      </div>

      {/* Left Sidebar with Persona Tabs */}
      <div
        className={`fixed left-0 top-0 h-full bg-base-300 flex flex-col border-r border-base-200 transition-all duration-300 transform ${
          isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
        }`}
        style={{ width: "16rem" }}
      >
        <div className="p-4 flex flex-col flex-grow">
          {/* Sidebar Toggle Button (only visible when sidebar is open) */}
          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="btn btn-sm btn-circle btn-ghost hover:bg-base-300 transition-all duration-300 mb-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          <div className="flex flex-col space-y-3">
            {testData?.selectedPersonas.map((persona, index) => {
              const isActive = index === selectedPersonaIndex;
              return (
                <div key={persona.id} className="flex flex-col">
                  <button
                    onClick={() => setSelectedPersonaIndex(index)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-base-200 text-base-content/80"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        isActive ? "bg-primary" : "bg-base-content/40"
                      }`}
                    />
                    <span className="text-sm font-medium truncate transition-colors duration-300">
                      {persona.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action Buttons at the bottom */}
          <div className="mt-auto pt-4 flex flex-col space-y-2">
            <button
              className="btn btn-sm btn-neutral shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => router.push("/syllabusplayground")}
            >
              Back to Playground
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "ml-0" : "ml-64"
        }`}
      >
        <div className="flex flex-col flex-grow p-6">
          <div className="w-full max-w-6xl mx-auto flex items-center justify-center min-h-[calc(100vh-3rem)]">
            <div className="grid grid-cols-2 gap-4 w-full">
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
                        disabled={currentPage + 1 >= (testData?.pdfPages.length ?? 1)}
                      >
                        Next Page »
                      </button>
                    </div>
                  </div>
                  <div className="border border-base-300 rounded-lg bg-white h-[800px] overflow-hidden">
                    <iframe
                      src={testData?.pdfPages[currentPage]}
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
                    {analysis?.isProcessing && (
                      <div className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm" />
                        <span className="text-sm">Analyzing...</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-base-200 rounded-lg p-4 h-[800px] overflow-auto">
                    <div className="prose prose-sm max-w-none">
                      {analysis?.response ? (
                        <div className="whitespace-pre-wrap text-base-content">
                          {analysis.response}
                        </div>
                      ) : (
                        <div className="text-base-content/70 italic">
                          {analysis?.isProcessing ? "Analyzing..." : "No analysis available"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
