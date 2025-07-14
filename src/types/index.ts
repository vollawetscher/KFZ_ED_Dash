export interface CallRecord {
  id: string;
  caller_number: string;
  transcript: string;
  timestamp: string;
  duration?: number | null;
  processed_at: string;
}

export interface CallsResponse {
  calls: CallRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface CallStats {
  total_calls: number;
  today_calls: number;
  week_calls: number;
  unique_callers: number;
}

export interface SearchFilters {
  search: string;
  caller: string;
  from_date: string;
  to_date: string;
}