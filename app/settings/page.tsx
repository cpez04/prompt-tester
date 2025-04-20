"use client";

import { useState, useEffect } from "react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import ProfileIcon from "@/components/ProfileIcon";
import { User } from "@supabase/supabase-js";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();
  const [activeTab, setActiveTab] = useState<"password" | "email" | "delete">(
    "password",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [supabase]);

  const handleTabChange = (tab: "password" | "email" | "delete") => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
    setShowDeleteConfirm(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Try to sign in with the new email to check if it exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: newEmail,
        password: "dummy-password", // Use a dummy password to check email existence
      });

      // If we get a specific error about invalid credentials, it means the email exists
      if (signInError?.message?.includes("Invalid login credentials")) {
        throw new Error("This email is already in use by another account");
      }

      // If we get a different error, it might mean the email doesn't exist
      // or there's another issue, but we'll proceed with the update
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) throw updateError;

      setSuccess(
        "Email updated successfully. Please check your new email for verification.",
      );
      setNewEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Get the current user's email
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User email not found");
      }

      // First delete user data from your database
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user data");
      }

      // Then delete the user from Supabase auth
      const { error } = await supabase.auth.admin.deleteUser(user.email);

      if (error) throw error;

      await supabase.auth.signOut().then(() => {
        router.push("/?deleted=true");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl relative">
      <div className="fixed right-4 top-4">
        <ProfileIcon user={user} loading={loading} />
      </div>

      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      <div className="tabs tabs-boxed mb-8">
        <button
          className={`tab ${activeTab === "password" ? "tab-active" : ""}`}
          onClick={() => handleTabChange("password")}
        >
          Change Password
        </button>
        <button
          className={`tab ${activeTab === "email" ? "tab-active" : ""}`}
          onClick={() => handleTabChange("email")}
        >
          Change Email
        </button>
        <button
          className={`tab ${activeTab === "delete" ? "tab-active" : ""}`}
          onClick={() => handleTabChange("delete")}
        >
          Delete Account
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}

      <div className="bg-base-100 p-6 rounded-lg shadow-lg">
        {activeTab === "password" && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">Current Password</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">New Password</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}

        {activeTab === "email" && (
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">New Email</span>
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Update Email"
              )}
            </button>
          </form>
        )}

        {activeTab === "delete" && (
          <div className="space-y-4">
            {!showDeleteConfirm ? (
              <>
                <div className="alert alert-warning">
                  <span>
                    Warning: This action cannot be undone. All your data will be
                    permanently deleted.
                  </span>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-error w-full"
                >
                  Delete Account
                </button>
              </>
            ) : (
              <>
                <div className="alert alert-error">
                  <span>
                    Are you sure you want to delete your account? This action
                    cannot be undone.
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="btn btn-error flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Confirm Delete"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
