"use client";

import { TestRun } from "@/types/admin";
import Pagination from "@/components/Pagination";

interface TestRunsTabProps {
  testRuns: TestRun[];
  totalRuns: number;
  page: number;
  pageSize: number;
  creatorFilter: string;
  isLoadingPage: boolean;
  onCreatorFilterChange: (filter: string) => void;
  onTestRunClick: (runId: string) => void;
  onDeleteRun: (run: TestRun) => void;
  onPageChange: (page: number) => void;
}

export default function TestRunsTab({
  testRuns,
  totalRuns,
  page,
  pageSize,
  creatorFilter,
  isLoadingPage,
  onCreatorFilterChange,
  onTestRunClick,
  onDeleteRun,
  onPageChange,
}: TestRunsTabProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        {/* Filter by User - moved to left */}
        <label className="input input-bordered flex items-center gap-2 w-full max-w-xs">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-base-content/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            className="grow"
            placeholder="Filter by user..."
            value={creatorFilter}
            onChange={(e) => onCreatorFilterChange(e.target.value)}
          />
          {creatorFilter && (
            <button
              onClick={() => onCreatorFilterChange("")}
              className="btn btn-sm btn-ghost px-2"
            >
              ✕
            </button>
          )}
        </label>

        {/* Pagination Controls - moved to right */}
        <Pagination
          currentPage={page}
          totalItems={totalRuns}
          pageSize={pageSize}
          onPageChange={onPageChange}
          isLoading={isLoadingPage}
        />
      </div>

      {isLoadingPage ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-dots loading-lg"></span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testRuns.map((run) => (
              <div
                key={run.id}
                className="card bg-base-100 shadow-md border border-base-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest(".dropdown"))
                    return;
                  onTestRunClick(run.id);
                }}
              >
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <h2 className="card-title text-base font-semibold">
                      {run.assistantName}
                    </h2>
                    <div className="dropdown dropdown-end">
                      <div
                        tabIndex={0}
                        role="button"
                        className="btn btn-ghost btn-sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </div>
                      <ul
                        tabIndex={0}
                        className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                      >
                        <li>
                          <a onClick={() => onDeleteRun(run)}>Delete</a>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="text-sm text-base-content/80">
                    <div>
                      <span className="font-medium">Model:</span> {run.model}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(run.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">User:</span>{" "}
                      {run.user
                        ? `${run.user.firstName} ${run.user.lastName}`.trim()
                        : "Unknown"}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          run.status === "Complete"
                            ? "bg-success/20 text-success"
                            : "bg-warning/20 text-warning"
                        }`}
                      >
                        {run.status === "Complete" ? "Completed" : "In Progress"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}