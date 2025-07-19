"use client";

import { useEffect, useState } from "react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import ProfileIcon from "@/components/ProfileIcon";
import UsersTab from "@/components/UsersTab";
import TestRunsTab from "@/components/admin/TestRunsTab";
import TestRunDetail from "@/components/admin/TestRunDetail";
import MetricsTab from "@/components/admin/MetricsTab";
import FeaturesTab from "@/components/admin/FeaturesTab";
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useTestRuns } from "@/hooks/useTestRuns";
import { TestRun } from "@/types/admin";


export default function AdminClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin } = useAdminStatus();
  const [activeTab, setActiveTab] = useState<
    "runs" | "users" | "admin" | "metrics" | "features"
  >("runs");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [runToDelete, setRunToDelete] = useState<TestRun | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [metrics, setMetrics] = useState<{
    totalMessages: number;
    totalRuns: number;
    averageMessagesPerRun: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    testRuns,
    totalRuns,
    page,
    creatorFilter,
    isLoadingPage,
    selectedRun,
    isLoadingSelectedRun,
    setCreatorFilter,
    setSelectedRun,
    loadFullTestRun,
    handlePageChange,
    deleteTestRun,
    PAGE_SIZE
  } = useTestRuns();

  const supabase = createPagesBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
      }
      setLoading(false);
    };
    getUser();
  }, [supabase]);


  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/admin/metrics");
        if (!response.ok) throw new Error("Failed to fetch metrics");
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };
    fetchMetrics();
  }, []);

  const refreshSelectedRun = async () => {
    if (!selectedRun) return;

    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/admin/getTestRun?testRunId=${selectedRun.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch updated run data");
      }
      const updatedRun = await response.json();
      setSelectedRun(updatedRun);
    } catch (error) {
      console.error("Error refreshing run:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteRun = async () => {
    if (!runToDelete) return;

    try {
      setIsDeleting(true);
      const success = await deleteTestRun(runToDelete.id);
      
      if (success) {
        setShowDeleteModal(false);
        setRunToDelete(null);
      } else {
        alert("Failed to delete test run");
      }
    } catch (error) {
      console.error("Error deleting test run:", error);
      alert("Failed to delete test run");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-base-200 p-8">
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center mb-8">
        {selectedRun ? (
          <button
            className="btn btn-ghost"
            onClick={() => setSelectedRun(null)}
          >
            ← Back to Test Runs
          </button>
        ) : (
          <div className="tabs tabs-boxed">
            <a
              className={`tab ${activeTab === "runs" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("runs")}
            >
              Test Runs
            </a>
            <a
              className={`tab ${activeTab === "users" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              Users
            </a>
            <a
              className={`tab ${activeTab === "metrics" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("metrics")}
            >
              Metrics
            </a>
            <a
              className={`tab ${activeTab === "features" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("features")}
            >
              Features
            </a>
          </div>
        )}
        <ProfileIcon user={user} loading={loading} isAdmin={isAdmin} />
      </div>

      <div className="max-w-7xl mx-auto">
        {isLoadingSelectedRun ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-4 text-base-content/70">Loading test run details...</p>
            </div>
          </div>
        ) : selectedRun ? (
          <TestRunDetail
            testRun={selectedRun}
            isRefreshing={isRefreshing}
            isSidebarCollapsed={isSidebarCollapsed}
            onRefresh={refreshSelectedRun}
            onSidebarToggle={setIsSidebarCollapsed}
            onBack={() => setSelectedRun(null)}
          />
        ) : (
          <>
            {activeTab === "runs" && (
              <TestRunsTab
                testRuns={testRuns}
                totalRuns={totalRuns}
                page={page}
                pageSize={PAGE_SIZE}
                creatorFilter={creatorFilter}
                isLoadingPage={isLoadingPage}
                onCreatorFilterChange={setCreatorFilter}
                onTestRunClick={loadFullTestRun}
                onDeleteRun={(run) => {
                  setRunToDelete(run);
                  setShowDeleteModal(true);
                }}
                onPageChange={handlePageChange}
              />
            )}

            {activeTab === "metrics" && <MetricsTab metrics={metrics} />}

            {activeTab === "users" && (
              <div className="overflow-x-auto">
                <UsersTab />
              </div>
            )}

            {activeTab === "features" && <FeaturesTab />}
          </>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        testRun={runToDelete}
        isDeleting={isDeleting}
        onConfirm={handleDeleteRun}
        onCancel={() => {
          setShowDeleteModal(false);
          setRunToDelete(null);
        }}
      />
    </div>
  );
}
