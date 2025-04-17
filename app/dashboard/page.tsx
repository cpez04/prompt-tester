"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import ProfileIcon from "@/components/ProfileIcon";

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

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!user && !userLoading) {
      router.push("/login");
      return;
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    const fetchTestRuns = async () => {
      if (!user) return;

      try {
        setDataLoaded(false);
        const response = await fetch(`/api/getUserTestRuns?userId=${user.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch test runs");
        }
        const data = await response.json();
        setTestRuns(data.testRuns);
        setDataLoaded(true);
      } catch (error) {
        console.error("Error fetching test runs:", error);
        setDataLoaded(true);
      }
    };

    if (user) {
      fetchTestRuns();
    }
  }, [user]);

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
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
          <h1 className="text-3xl font-bold">My Test Runs</h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <ProfileIcon user={user} loading={userLoading} />
            <button
              className="btn btn-primary w-full sm:w-auto"
              onClick={handleNewTest}
            >
              Start New Test
            </button>
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
