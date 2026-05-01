export type GoalType     = 'numeric' | 'average' | 'habit' | 'milestone'
export type GoalStatus   = 'active' | 'completed' | 'archived'
export type LinkType     = 'routine' | 'task_list'
export type ProgressMode = 'additive' | 'snapshot'
export type Frequency    = 'daily' | 'weekdays' | 'weekends' | '2x_week' | '3x_week'

export interface Goal {
  id:                  string
  user_id:             string
  title:               string
  description:         string | null
  type:                GoalType
  status:              GoalStatus
  // Numeric / average fields
  start_value:         number | null
  target_value:        number | null
  current_value:       number
  unit:                string | null
  progress_mode:       ProgressMode
  milestone_step:      number | null
  // Habit fields
  frequency:           Frequency | null
  // Dates
  start_date:          string | null
  target_date:         string | null
  // Appearance
  color:               string | null
  emoji:               string | null
  // Data source for auto-sync
  data_source:         string
  data_source_metric:  string | null
  created_at:          string
  updated_at:          string
}

export interface GoalMilestone {
  id:           string
  goal_id:      string
  user_id:      string
  title:        string
  target_value: number | null
  completed_at: string | null
  sort_order:   number
  created_at:   string
}

export interface GoalProgressLog {
  id:        string
  goal_id:   string
  user_id:   string
  value:     number
  note:      string | null
  logged_at: string
}

export interface HabitCheckin {
  id:         string
  goal_id:    string
  user_id:    string
  checked_on: string   // date YYYY-MM-DD
  note:       string | null
  created_at: string
}

export interface GoalLink {
  id:          string
  goal_id:     string
  user_id:     string
  linked_type: LinkType
  linked_id:   string
  created_at:  string
}

export interface GoalWithRelations extends Goal {
  milestones: GoalMilestone[]
  links:      GoalLink[]
}
