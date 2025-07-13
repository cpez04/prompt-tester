"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";
import { MAX_TEST_RUNS } from "@/lib/constants";
import { useAdminStatus } from "@/hooks/useAdminStatus";

interface TestRun {
  id: string;
  assistantName: string;
  model: string;
  createdAt: string;
  prompt: string;
  personaContext: string;
  updatedSystemPrompt: string | null;
  status: "Complete" | "In Progress" | "Expired";
  personasOnRun: {
    id: string;
    persona: {
      id: string;
      name: string;
    };
  }[];
  chatbotThreads: {
    id: string;
    personaName: string;
  }[];
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();
  const { isAdmin } = useAdminStatus();

  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showMaxRunsAlert, setShowMaxRunsAlert] = useState(false);
  const [maxRuns, setMaxRuns] = useState(MAX_TEST_RUNS);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [prefetchedData, setPrefetchedData] = useState<{
    [key: number]: TestRun[];
  }>({});
  const PAGE_SIZE = 9;

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
        const response = await fetch(
          `/api/getUserTestRuns?userId=${user.id}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
        );
        if (!response.ok) throw new Error("Failed to fetch test runs");
        const data = await response.json();
        setTestRuns(data.testRuns);
        setTotalRuns(data.totalCount);
        setDataLoaded(true);
        setLastFetchTime(now);
      } catch (error) {
        console.error("Error fetching test runs:", error);
        setDataLoaded(true);
      }
    };

    if (user) fetchTestRuns();
  }, [user, lastFetchTime, page]);

  const handlePageChange = async (newPage: number) => {
    // Check if we have prefetched data for this page
    if (prefetchedData[newPage]) {
      setTestRuns(prefetchedData[newPage]);
      setPage(newPage);
      return;
    }

    setIsLoadingPage(true);
    try {
      const response = await fetch(
        `/api/getUserTestRuns?userId=${user?.id}&limit=${PAGE_SIZE}&offset=${newPage * PAGE_SIZE}`,
      );
      if (!response.ok) throw new Error("Failed to fetch test runs");
      const data = await response.json();
      setTestRuns(data.testRuns);
      setTotalRuns(data.totalCount);
      setPage(newPage);
    } catch (error) {
      console.error("Error fetching test runs:", error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleNewTest = () => router.push("/playground");

  const getButtonText = (run: TestRun) => {
    if (run.status === "In Progress") return "Resume";
    return "View";
  };

  const handleButtonClick = (run: TestRun) => {
    if (run.status === "In Progress") {
      router.push(`/runTests/${run.id}`);
    } else {
      router.push(`/evaluateChats/${run.id}`);
    }
  };

  // Prefetch function
  const prefetchPage = useCallback(
    async (pageNumber: number) => {
      if (prefetchedData[pageNumber] || !user) return;

      try {
        const response = await fetch(
          `/api/getUserTestRuns?userId=${user.id}&limit=${PAGE_SIZE}&offset=${pageNumber * PAGE_SIZE}`,
        );
        if (response.ok) {
          const data = await response.json();
          setPrefetchedData((prev) => ({
            ...prev,
            [pageNumber]: data.testRuns,
          }));
        }
      } catch (error) {
        console.error("Error prefetching page:", error);
      }
    },
    [prefetchedData, user, PAGE_SIZE],
  );

  // Prefetch next and previous pages
  useEffect(() => {
    if (user && dataLoaded) {
      // Prefetch next page
      if ((page + 1) * PAGE_SIZE < totalRuns) {
        prefetchPage(page + 1);
      }
      // Prefetch previous page
      if (page > 0) {
        prefetchPage(page - 1);
      }
    }
  }, [page, user, dataLoaded, totalRuns, prefetchPage, PAGE_SIZE]);

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
              {dataLoaded && testRuns.length < maxRuns && (
                <button
                  onClick={handleNewTest}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-medium shadow-sm hover:shadow-md transition duration-200 hover:bg-primary-focus hover:scale-105 active:scale-95"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90"
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
                  Start New Test
                </button>
              )}

              {dataLoaded && (
                <div className="w-full sm:w-auto">
                  <div className="text-sm font-semibold text-base-content mb-1">
                    Test Runs Remaining: {maxRuns - testRuns.length}
                  </div>
                </div>
              )}
            </div>
            <div className="absolute top-4 right-4">
              <ProfileIcon user={user} loading={userLoading} isAdmin={isAdmin} />
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
          <>
            {isLoadingPage ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="loading loading-dots loading-md text-primary"></span>
                <span className="text-lg font-medium mt-2">
                  Loading test runs...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {testRuns.map((run) => (
                  <div
                    key={run.id}
                    className="card bg-base-100 shadow-md border border-base-300 transition-transform duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
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
                              run.status === "In Progress"
                                ? "badge-warning"
                                : run.status === "Expired"
                                  ? "badge-error"
                                  : "badge-success"
                            }`}
                          >
                            {run.status}
                          </span>
                        </div>
                      </div>
                      <div className="card-actions justify-end mt-4">
                        <button
                          className={`btn btn-sm ${
                            run.status === "In Progress"
                              ? "btn-primary"
                              : run.status === "Expired"
                                ? "btn-error"
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
            {Math.ceil(totalRuns / PAGE_SIZE) > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  className="btn btn-sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0 || isLoadingPage}
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Page</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.ceil(totalRuns / PAGE_SIZE)}
                    value={page + 1}
                    onChange={(e) => {
                      const newPage = parseInt(e.target.value) - 1;
                      if (
                        !isNaN(newPage) &&
                        newPage >= 0 &&
                        newPage < Math.ceil(totalRuns / PAGE_SIZE)
                      ) {
                        handlePageChange(newPage);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const newPage = parseInt(e.currentTarget.value) - 1;
                        if (
                          !isNaN(newPage) &&
                          newPage >= 0 &&
                          newPage < Math.ceil(totalRuns / PAGE_SIZE)
                        ) {
                          handlePageChange(newPage);
                        }
                      }
                    }}
                    className="input input-bordered input-sm w-16 text-center"
                  />
                  <span className="text-sm">
                    of {Math.ceil(totalRuns / PAGE_SIZE)}
                  </span>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={
                    (page + 1) * PAGE_SIZE >= totalRuns || isLoadingPage
                  }
                >
                  Next
                </button>
              </div>
            )}
          </>
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
