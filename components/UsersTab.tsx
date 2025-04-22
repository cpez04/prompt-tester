"use client";

import { useEffect, useState } from "react";
import UserLimitModal from "./UserLimitModal";

interface User {
  id: string;
  email: string;
  user_metadata?: {
    firstName?: string;
    lastName?: string;
  };
  last_sign_in_at?: string;
  maxRuns?: number;
}

const USERS_PER_PAGE = 12;

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [animatedMaxRuns, setAnimatedMaxRuns] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUserLimitModal, setShowUserLimitModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserLimit, setNewUserLimit] = useState<number>(0);
  const [, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(
          `/api/admin/users?page=${currentPage}&limit=${USERS_PER_PAGE}`,
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch users");
        }

        setUsers(data.users ?? []);
        setTotalPages(Math.ceil((data.totalCount ?? 0) / USERS_PER_PAGE));

        // Initialize animated maxRuns
        const animatedInitial: Record<string, string> = {};
        for (const user of data.users ?? []) {
          animatedInitial[user.id] = user.maxRuns?.toString() ?? "N/A";
        }
        setAnimatedMaxRuns(animatedInitial);
      } catch (err: unknown) {
        console.error("Error fetching users:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage]);

  const handleUpdateUserLimit = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch("/api/admin/userLimits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          maxRuns: newUserLimit,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user limit");
      }

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === selectedUser.id
            ? { ...user, maxRuns: newUserLimit }
            : user,
        ),
      );

      // Animate change
      const userId = selectedUser.id;
      const newStr = newUserLimit.toString();
      setAnimatedMaxRuns((prev) => ({ ...prev, [userId]: "" }));

      newStr.split("").forEach((char, index) => {
        setTimeout(() => {
          setAnimatedMaxRuns((prev) => ({
            ...prev,
            [userId]: (prev[userId] ?? "") + char,
          }));
        }, 50 * index);
      });

      setShowUserLimitModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user limit:", error);
      alert("Failed to update user limit");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This will delete all their data and cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/deleteUser?userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-lg mt-6">
        <div>
          <span>Error loading users: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {users.map((user) => {
          const firstName = user.user_metadata?.firstName ?? "N/A";
          const lastName = user.user_metadata?.lastName ?? "";
          const fullName = `${firstName} ${lastName}`.trim();

          return (
            <div key={user.id} className="card bg-base-100 shadow-md">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">{fullName}</h3>
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
                        <a
                          onClick={() => {
                            setSelectedUser(user);
                            setNewUserLimit(user.maxRuns ?? 0);
                            setShowUserLimitModal(true);
                          }}
                        >
                          Update Max Runs
                        </a>
                      </li>
                      <li>
                        <a
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-error"
                        >
                          Delete User
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-base-content/80">{user.email}</p>
                <p className="text-xs text-base-content/60 mt-2">
                  <strong>User ID:</strong> {user.id}
                </p>
                <p className="text-xs text-base-content/60">
                  <strong>Last Sign In:</strong>{" "}
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : "Never"}
                </p>
                <p className="text-xs text-base-content/60">
                  <strong>Max Test Runs:</strong>{" "}
                  <span className="font-mono transition-opacity duration-300 ease-in-out">
                    {animatedMaxRuns[user.id] ??
                      user.maxRuns?.toString() ??
                      "N/A"}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="btn btn-sm btn-disabled">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      <UserLimitModal
        isOpen={showUserLimitModal}
        onClose={() => {
          setShowUserLimitModal(false);
          setSelectedUser(null);
        }}
        onSave={handleUpdateUserLimit}
        userLimit={newUserLimit}
        setUserLimit={setNewUserLimit}
        userName={selectedUser?.user_metadata?.firstName ?? "User"}
      />
    </div>
  );
}
