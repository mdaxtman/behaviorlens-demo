export type UUID = string;

export interface Student {
  id: UUID; code: string; grade: string | null; notes: string | null;
  color: string; active: boolean; created_at: string;
}

export interface Behavior {
  id: UUID; student_id: UUID; name: string; description: string | null;
  category: 'challenging' | 'skill';
  track_frequency: boolean; track_duration: boolean; track_rating: boolean;
  requires_abc: boolean; active: boolean; created_at: string;
}

export interface AbcPreset {
  id: UUID; kind: 'antecedent' | 'consequence' | 'setting';
  label: string; sort_order: number; active: boolean; created_at: string;
}

export interface Session {
  id: UUID; activity: string; setting: string | null;
  started_at: string; ended_at: string | null; note: string | null; created_at: string;
}

export interface BehaviorEvent {
  id: UUID; student_id: UUID; behavior_id: UUID; session_id: UUID | null;
  occurred_at: string; count: number; duration_seconds: number | null;
  rating: number | null; antecedent: string | null; consequence: string | null;
  setting: string | null; note: string | null; recorder: string | null; created_at: string;
  /** Creator = the person recording (a profile id). */
  user_id?: UUID | null;
}

export interface Goal {
  id: UUID; student_id: UUID; title: string; description: string | null;
  mode: 'linked' | 'direct'; behavior_ids: UUID[];
  criterion_direction: 'at_most' | 'at_least' | null;
  criterion_value: number | null;
  criterion_metric: 'count_per_day' | 'minutes_per_day' | 'avg_rating' | null;
  criterion_percent: number | null;
  baseline: string | null; target_date: string | null; active: boolean; created_at: string;
}

export interface GoalEntry {
  id: UUID; goal_id: UUID; session_id: UUID | null; occurred_at: string;
  successes: number; opportunities: number; note: string | null; created_at: string;
  device_id: string | null;
}

export interface Profile {
  id: UUID; display_name: string; initials: string;
  role: 'admin' | 'member'; active: boolean; created_at: string;
}
