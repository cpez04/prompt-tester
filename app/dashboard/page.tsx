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
        if (!response.ok) {
          throw new Error("Failed to fetch user limit");
        }
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
      // Remove the error parameter from the URL
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
      if (lastFetchTime && now - lastFetchTime < 30000000) {
        return;
      }

      try {
        setDataLoaded(false);
        const response = await fetch(`/api/getUserTestRuns?userId=${user.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch test runs");
        }
        const data = await response.json();
        setTestRuns(data.testRuns);
        setDataLoaded(true);
        setLastFetchTime(now);
      } catch (error) {
        console.error("Error fetching test runs:", error);
        setDataLoaded(true);
      }
    };

    if (user) {
      fetchTestRuns();
    }
  }, [user, lastFetchTime]);

  const handleNewTest = () => {
    router.push("/playground");
  };

  const handleViewTest = (testRunId: string) => {
    router.push(`/evaluateChats/${testRunId}`);
  };

  const handleRunTest = (testRunId: string) => {
    router.push(`/runTests/${testRunId}`);
  };

  const getButtonText = (run: TestRun) => {
    if (run.totalMessages === 0) {
      return "Run";
    }
    if (run.updatedSystemPrompt) {
      return "Completed";
    }
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
            {/* Icon */}
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

            {/* Message */}
            <span>
              Maximum limit of {maxRuns} test runs reached. Please contact
              support to increase your limit.
            </span>

            {/* Close button */}
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Test Runs</h1>
            {dataLoaded && (
              <div className="w-full sm:max-w-sm">
                <div className="text-sm font-semibold text-base-content mb-1">
                  Test Runs Used: {testRuns.length} / {maxRuns}
                </div>
                <progress
                  className={`progress w-full h-4 ${
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
          </div>

          <div className="flex items-center gap-4">
            <ProfileIcon user={user} loading={userLoading} />
            {dataLoaded && testRuns.length < maxRuns && (
              <button className="btn btn-primary" onClick={handleNewTest}>
                Start New Test
              </button>
            )}
          </div>
        </div>

        {!dataLoaded ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex items-center gap-2 mb-2">
              <span className="loading loading-dots loading-md text-primary"></span>
              <span className="text-lg font-medium">
                Loading your test runs...
              </span>
            </div>
          </div>
        ) : testRuns.length === 0 ? (
          <div className="text-center py-12 text-lg text-gray-500">
            You have no test runs yet. Click &quot;Start New Test&quot; to
            begin!
          </div>
        ) : (
          <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Assistant Name</th>
                  <th>Model</th>
                  <th>Created At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.assistantName}</td>
                    <td>{run.model}</td>
                    <td>{new Date(run.createdAt).toLocaleString()}</td>
                    <td>
                      {run.totalMessages === 0
                        ? "Not Started"
                        : run.updatedSystemPrompt
                          ? "Completed"
                          : "In Progress"}
                    </td>
                    <td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
