import { useState, useEffect, useCallback } from 'react';
import { CallRecord, CallsResponse, CallStats, SearchFilters } from '../types';

const API_BASE_URL = 'https://kfzeddash-production.up.railway.app';

export function useCallData() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchCalls = useCallback(async (filters: Partial<SearchFilters> = {}, limit = 50, offset = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value.trim() !== '')
        )
      });
      
      const response = await fetch(`${API_BASE_URL}/api/calls?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: CallsResponse = await response.json();
      
      if (offset === 0) {
        setCalls(data.calls);
      } else {
        setCalls(prev => [...prev, ...data.calls]);
      }
      
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calls');
      console.error('Error fetching calls:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      const response = await fetch(`${API_BASE_URL}/api/stats`);

      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: CallStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const addNewCall = useCallback((newCall: CallRecord) => {
    setCalls(prev => [newCall, ...prev]);
    setTotal(prev => prev + 1);
    fetchStats(); // Refresh stats when new call is added
  }, [fetchStats]);

  useEffect(() => {
    fetchCalls();
    fetchStats();
  }, [fetchCalls, fetchStats]);

  return {
    calls,
    stats,
    loading,
    error,
    total,
    fetchCalls,
    fetchStats,
    addNewCall
  };
}
