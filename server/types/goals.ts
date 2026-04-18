export type GoalType   = 'numeric' | 'habit' | 'time_based' | 'milestone'
export type GoalStatus = 'active' | 'completed' | 'archived'
export type LinkType   = 'routine' | 'task_list'

export interface Goal {
  id:            string
  user_id:       string
  title:         string
  description:   string | null
  type:          GoalType
  status:        GoalStatus
  target_value:  number | null
  current_value: number
  unit:          string | null
  start_date:    string | null
  target_date:   string | null
  color:         string | null
  emoji:         string | null
  created_at:    string
  updated_at:    string
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
