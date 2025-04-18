"use client";

import { useState } from "react";
import { MAX_TEST_RUNS } from "@/lib/constants";

interface UserLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, maxRuns: number) => Promise<void>;
}

export default function UserLimitModal({
  isOpen,
  onClose,
  onSave,
}: UserLimitModalProps) {
  const [userId, setUserId] = useState("");
  const [maxRuns, setMaxRuns] = useState(MAX_TEST_RUNS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // First check if the user exists in the user limits table
      const checkResponse = await fetch(
        `/api/admin/userLimits?userId=${userId}`,
      );
      if (!checkResponse.ok) {
        throw new Error("Failed to check user existence");
      }

      const { userLimit } = await checkResponse.json();
      if (!userLimit) {
        throw new Error("User ID not found in the user limits table");
      }

      await onSave(userId, maxRuns);
      setUserId("");
      setMaxRuns(MAX_TEST_RUNS);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update user limit",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit User Limit</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">User ID</span>
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="input input-bordered w-full"
              required
              placeholder="Enter existing user ID"
            />
            <span className="text-sm text-gray-500 mt-1">
              Note: The user ID must already exist in the user limits table
            </span>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Maximum Runs</span>
            </label>
            <input
              type="number"
              value={maxRuns}
              onChange={(e) =>
                setMaxRuns(
                  Math.max(
                    MAX_TEST_RUNS,
                    Math.min(
                      2_147_483_647,
                      parseInt(e.target.value) || MAX_TEST_RUNS,
                    ),
                  ),
                )
              }
              className="input input-bordered w-full"
              min={MAX_TEST_RUNS}
              max={2_147_483_647}
              required
            />

            <span className="text-sm text-gray-500 mt-1">
              Minimum: {MAX_TEST_RUNS} runs
            </span>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Update Limit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
