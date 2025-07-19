import { useState, useEffect, useCallback } from "react";
import { usePageCache } from "./usePageCache";
import { TestRun } from "@/types/admin";

const PAGE_SIZE = 9;

export function useTestRuns() {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [page, setPage] = useState(0);
  const [creatorFilter, setCreatorFilter] = useState<string>("");
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [isLoadingSelectedRun, setIsLoadingSelectedRun] = useState(false);

  const { getCachedPage, setCachedPage, clearCache } = usePageCache();

  const fetchPageData = useCallback(async (pageNum: number, filter: string, background = false) => {
    // Check cache first
    const cached = getCachedPage(pageNum, filter);
    if (cached) {
      if (!background) {
        setTestRuns(cached.testRuns);
        setTotalRuns(cached.totalCount);
      }
      return cached;
    }

    try {
      const response = await fetch(
        `/api/admin/getTestRuns?limit=${PAGE_SIZE}&offset=${pageNum * PAGE_SIZE}${
          filter ? `&creator=${encodeURIComponent(filter)}` : ""
        }`,
      );
      const result = await response.json();
      
      // Cache the result
      setCachedPage(pageNum, filter, result);
      
      if (!background) {
        setTestRuns(result.testRuns);
        setTotalRuns(result.totalCount);
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching page data:", error);
      return null;
    }
  }, [getCachedPage, setCachedPage]);

  const loadFullTestRun = useCallback(async (runId: string) => {
    try {
      setIsLoadingSelectedRun(true);
      const response = await fetch(`/api/admin/getTestRun?testRunId=${runId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch test run details");
      }
      const fullRun = await response.json();
      setSelectedRun(fullRun);
    } catch (error) {
      console.error("Error loading test run:", error);
    } finally {
      setIsLoadingSelectedRun(false);
    }
  }, []);

  const handlePageChange = useCallback(async (newPage: number) => {
    // Check if we have cached data for this page
    const cached = getCachedPage(newPage, creatorFilter);
    
    if (cached) {
      // Instant navigation with cached data
      setTestRuns(cached.testRuns);
      setTotalRuns(cached.totalCount);
      setPage(newPage);
      
      // Preload adjacent pages in background
      const totalPages = Math.ceil(cached.totalCount / PAGE_SIZE);
      const preloadPromises: Promise<{ testRuns: TestRun[], totalCount: number } | null>[] = [];
      
      if (newPage > 0) {
        preloadPromises.push(fetchPageData(newPage - 1, creatorFilter, true));
      }
      if (newPage < totalPages - 1) {
        preloadPromises.push(fetchPageData(newPage + 1, creatorFilter, true));
      }
      
      Promise.all(preloadPromises).catch(error => {
        console.log("Preload error (non-critical):", error);
      });
    } else {
      // Fall back to loading state if not cached
      setIsLoadingPage(true);
      try {
        await fetchPageData(newPage, creatorFilter);
        setPage(newPage);
      } catch (error) {
        console.error("Error fetching test runs:", error);
      } finally {
        setIsLoadingPage(false);
      }
    }
  }, [getCachedPage, creatorFilter, fetchPageData]);

  const deleteTestRun = useCallback(async (runId: string) => {
    try {
      const response = await fetch(`/api/admin/deleteTestRun?testRunId=${runId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete test run");
      }

      // Clear cache and refetch current page since data has changed
      clearCache();
      await fetchPageData(page, creatorFilter);

      if (selectedRun?.id === runId) {
        setSelectedRun(null);
      }

      return true;
    } catch (error) {
      console.error("Error deleting test run:", error);
      return false;
    }
  }, [clearCache, fetchPageData, page, creatorFilter, selectedRun]);

  // Main data fetching effect
  useEffect(() => {
    const fetchAndPreload = async () => {
      setIsLoadingPage(true);
      try {
        // Fetch current page (this will use cache if available)
        const currentPageData = await fetchPageData(page, creatorFilter);
        
        if (currentPageData) {
          // Preload adjacent pages in background
          const totalPages = Math.ceil(currentPageData.totalCount / PAGE_SIZE);
          const preloadPromises: Promise<{ testRuns: TestRun[], totalCount: number } | null>[] = [];
          
          // Preload previous page
          if (page > 0) {
            preloadPromises.push(fetchPageData(page - 1, creatorFilter, true));
          }
          
          // Preload next page
          if (page < totalPages - 1) {
            preloadPromises.push(fetchPageData(page + 1, creatorFilter, true));
          }
          
          // Execute preloads without waiting for them
          Promise.all(preloadPromises).catch(error => {
            console.log("Preload error (non-critical):", error);
          });
        }
        
      } catch (error) {
        console.error("Error fetching test runs:", error);
      } finally {
        setIsLoadingPage(false);
      }
    };
    
    fetchAndPreload();
  }, [page, creatorFilter, fetchPageData]);

  // Clear cache when filter changes
  useEffect(() => {
    setPage(0); // Reset to first page when filter changes
    clearCache(); // Clear all cached data since filter affects results
  }, [creatorFilter, clearCache]);

  return {
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
  };
}