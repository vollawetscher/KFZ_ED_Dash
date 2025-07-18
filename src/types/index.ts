export interface EvaluationResult {
  result: 'success' | 'failure';
  rationale: string;
  criteria_id: string;
}

export interface CallRecord {
  id: string;
  caller_number: string;
  transcript: string;
  timestamp: string;
  duration?: number | null;
  processed_at: string;
  evaluation_results?: Record<string, EvaluationResult> | null;
  is_flagged_for_review?: boolean;
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
  conv_id: string;
  from_date: string;
  to_date: string;
}
