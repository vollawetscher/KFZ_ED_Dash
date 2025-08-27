import { useState, useEffect, useCallback } from 'react';
import { CallRecord, CallsResponse, CallStats, SearchFilters } from '../types';

const API_BASE_URL = 'https://kfzeddash-production.up.railway.app';

export function useCallData() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchCalls = useCallback(async (filters: Partial<SearchFilters> = {}, limit = 50, offset = 0, agentIds: string[] = []) => {
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
      
      if (agentIds.length > 0) {
        params.set('agent_ids', agentIds.join(','));
      }
      
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

  const fetchStats = useCallback(async (agentIds: string[] = []) => {
    try {
      const params = new URLSearchParams();
      if (agentIds.length > 0) {
        params.set('agent_ids', agentIds.join(','));
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_BASE_URL}/api/stats${queryString}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: CallStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const addNewCall = useCallback((newCall: CallRecord, userAgentIds: string[] = [], currentAgentFilter?: string) => {
    // Only add the call if it belongs to one of the user's allowed agents
    if (userAgentIds.length > 0 && !userAgentIds.includes(newCall.agent_id)) {
      return;
    }
    
    // Only add the call if it matches the current agent filter (if one is active)
    if (currentAgentFilter && newCall.agent_id !== currentAgentFilter) {
      return;
    }
    
    setCalls(prev => [newCall, ...prev]);
    setTotal(prev => prev + 1);
  }, []);

  const updateCallFlagStatus = useCallback(async (callId: string, isFlagged: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/calls/${callId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_flagged_for_review: isFlagged }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      setCalls(prev => prev.map(call => 
        call.id === callId 
          ? { ...call, is_flagged_for_review: isFlagged }
          : call
      ));

      return true;
    } catch (err) {
      console.error('Error updating call flag status:', err);
      return false;
    }
  }, []);

  return {
    calls,
    stats,
    loading,
    error,
    total,
    fetchCalls,
    fetchStats,
    addNewCall,
    updateCallFlagStatus
  };
}