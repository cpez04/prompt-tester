"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import { MAX_TEST_RUNS } from "@/lib/constants";

interface TestRun {
  id: string;
  assistantName: string;
  model: string;
  createdAt: string;
  prompt: string;
  personaContext: string;
  updatedSystemPrompt: string | null;
  totalMessages: number;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();

  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showMaxRunsAlert, setShowMaxRunsAlert] = useState(false);
  const [maxRuns, setMaxRuns] = useState(MAX_TEST_RUNS);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserLimit = async () => {
      if (!user) return;
      try {
        const response = await fetch("/api/getUserLimit");
        if (!response.ok) throw new Error("Failed to fetch user limit");
        const data = await response.json();
        setMaxRuns(data.maxRuns);
      } catch (error) {
        console.error("Error fetching user limit:", error);
      }
    };
    fetchUserLimit();
  }, [user]);

  useEffect(() => {
    if (searchParams.get("error") === "max_runs_reached") {
      setShowMaxRunsAlert(true);
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!user && !userLoading) {
      router.push("/login");
      return;
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    const fetchTestRuns = async () => {
      if (!user) return;
      const now = Date.now();
      if (lastFetchTime && now - lastFetchTime < 30000000) return;

      try {
        setDataLoaded(false);
        const response = await fetch(`/api/getUserTestRuns?userId=${user.id}`);
        if (!response.ok) throw new Error("Failed to fetch test runs");
        const data = await response.json();
        setTestRuns(data.testRuns);
        setDataLoaded(true);
        setLastFetchTime(now);
      } catch (error) {
        console.error("Error fetching test runs:", error);
        setDataLoaded(true);
      }
    };

    if (user) fetchTestRuns();
  }, [user, lastFetchTime]);

  const handleNewTest = () => router.push("/playground");
  const handleViewTest = (testRunId: string) =>
    router.push(`/evaluateChats/${testRunId}`);
  const handleRunTest = (testRunId: string) =>
    router.push(`/runTests/${testRunId}`);

  const getButtonText = (run: TestRun) => {
    if (run.totalMessages === 0) return "Run";
    if (run.updatedSystemPrompt) return "View Results";
    return "Evaluate";
  };

  const handleButtonClick = (run: TestRun) => {
    if (run.totalMessages === 0) {
      handleRunTest(run.id);
    } else {
      handleViewTest(run.id);
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
      {showMaxRunsAlert && (
        <div className="fixed top-4 right-4 z-50">
          <div className="alert alert-error shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M12 5a7 7 0 11-6.93 6.93A7 7 0 0112 5z"
              />
            </svg>
            <span>
              Maximum limit of {maxRuns} test runs reached. Please contact
              support to increase your limit.
            </span>
            <div className="flex-none">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowMaxRunsAlert(false)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Test Runs</h1>
          <hr className="border-base-content/20 mb-4" />
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {dataLoaded && (
                <div className="w-full sm:w-auto">
                  <div className="text-sm font-semibold text-base-content mb-1">
                    Test Runs Used: {testRuns.length} / {maxRuns}
                  </div>
                  <progress
                    className={`progress w-full sm:w-64 h-4 ${
                      testRuns.length >= maxRuns
                        ? "progress-error"
                        : testRuns.length >= maxRuns * 0.75
                          ? "progress-warning"
                          : "progress-primary"
                    }`}
                    value={testRuns.length}
                    max={maxRuns}
                  />
                </div>
              )}
              {dataLoaded && testRuns.length < maxRuns && (
                <button
                  onClick={handleNewTest}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-md bg-primary text-white hover:bg-primary-focus transform transition-transform duration-200 hover:scale-105 hover:shadow-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="font-medium">Start New Test</span>
                </button>
              )}
            </div>
            <div className="absolute top-4 right-4">
              <ProfileIcon user={user} loading={userLoading} />
            </div>
          </div>
        </div>

        {!dataLoaded ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-dots loading-md text-primary"></span>
            <span className="text-lg font-medium mt-2">
              Loading your test runs...
            </span>
          </div>
        ) : testRuns.length === 0 ? (
          <div className="text-center py-12 text-lg text-gray-500">
            You have no test runs yet. Click &quot;Start New Test&quot; to
            begin!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testRuns.map((run) => (
              <div
                key={run.id}
                className="card bg-base-100 shadow-md border border-base-300"
              >
                <div className="card-body">
                  <h2 className="card-title text-base font-semibold">
                    {run.assistantName}
                  </h2>
                  <div className="text-sm text-base-content/80">
                    <div>
                      <span className="font-medium">Assistant Model:</span>{" "}
                      {run.model}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(run.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      <span
                        className={`badge ${
                          run.totalMessages === 0
                            ? "badge-warning"
                            : run.updatedSystemPrompt
                              ? "badge-success"
                              : "badge-info"
                        }`}
                      >
                        {run.totalMessages === 0
                          ? "Not Started"
                          : run.updatedSystemPrompt
                            ? "Completed"
                            : "In Progress"}
                      </span>
                    </div>
                  </div>
                  <div className="card-actions justify-end mt-4">
                    <button
                      className={`btn btn-sm ${
                        run.totalMessages === 0
                          ? "btn-primary"
                          : run.updatedSystemPrompt
                            ? "btn-success"
                            : "btn-outline"
                      }`}
                      onClick={() => handleButtonClick(run)}
                    >
                      {getButtonText(run)}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-base-200">
          <span className="loading loading-spinner loading-lg" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
