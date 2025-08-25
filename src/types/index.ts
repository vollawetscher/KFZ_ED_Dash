export interface EvaluationResult {
  result: 'success' | 'failure';
  rationale: string;
  criteria_id: string;
}

export interface EvaluationCriterion {
  name: string;
  description: string;
}

export interface AgentConfig {
  id: string;
  branding_name: string;
  evaluation_criteria_config: Record<string, EvaluationCriterion>;
  created_at: string;
}

export interface DashboardUser {
  user_id?: string;
  username?: string;
  token: string;
  allowed_agent_ids: string[];
  is_developer: boolean;
  branding_data: AgentConfig[];
}

export interface CallRecord {
  id: string;
  agent_id: string;
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
  total_duration_minutes: number;
  total_bot_replies: number;
  average_duration_minutes: number;
  overall_rating_percent: number;
}

export interface SearchFilters {
  search: string;
  caller: string;
  conv_id: string;
  from_date: string;
  to_date: string;
}
