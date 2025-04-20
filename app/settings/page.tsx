"use client";

import { useState, useEffect } from "react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import ProfileIcon from "@/components/ProfileIcon";
import { User } from "@supabase/supabase-js";

export default function SettingsPage() {
  const supabase = createPagesBrowserClient();
  const [activeTab, setActiveTab] = useState<"password" | "email">(
    "password",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  const handleTabChange = (tab: "password" | "email") => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
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
      </div>
    </div>
  );
}
