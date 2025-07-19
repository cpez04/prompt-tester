import { useState, useCallback } from "react";
import { TestRun, CacheEntry } from "@/types/admin";

export function usePageCache() {
  const [pageCache, setPageCache] = useState<Map<string, CacheEntry>>(new Map());

  const getCacheKey = useCallback((pageNum: number, filter: string) => `${pageNum}_${filter}`, []);
  
  const getCachedPage = useCallback((pageNum: number, filter: string) => {
    const key = getCacheKey(pageNum, filter);
    const cached = pageCache.get(key);
    
    // Cache expires after 5 minutes
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached;
    }
    return null;
  }, [pageCache, getCacheKey]);
  
  const setCachedPage = useCallback((pageNum: number, filter: string, data: { testRuns: TestRun[], totalCount: number }) => {
    const key = getCacheKey(pageNum, filter);
    setPageCache(prev => new Map(prev).set(key, {
      ...data,
      timestamp: Date.now()
    }));
  }, [getCacheKey]);
  
  const clearCache = useCallback(() => {
    setPageCache(new Map());
  }, []);

  return {
    getCachedPage,
    setCachedPage,
    clearCache
  };
}